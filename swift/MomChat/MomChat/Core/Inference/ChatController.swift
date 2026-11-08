import Foundation
import FoundationModels
import Observation
import SwiftData

/// One open conversation: sends questions, streams answers, saves both. One `LanguageModelSession`
/// per conversation; it's rebuilt from the saved messages when the chat is reopened, or after an
/// error, a stop or a compaction, so the model always sees exactly what's saved.
///
/// Before every question the prompt is measured against `ContextBudget`. If it won't fit, the
/// oldest turns are folded into `Conversation.summary` and a fresh session starts with it. If the
/// model still overflows, everything is compacted and the question retried once, silently.
@Observable
final class ChatController {
    let child: Child
    /// `nil` until the first question: an empty chat isn't saved and doesn't show up in the history.
    private(set) var conversation: Conversation?
    /// The answer while it streams. `nil` when nothing is being generated.
    private(set) var streamingText: String?
    /// Why the last answer didn't come. Cleared by the next question or a retry.
    private(set) var failure: ChatFailure?
    /// The emergency card on screen. Set by the gate, before the model is involved.
    var presentedEmergency: EmergencyTopic?

    // For the debug overlay.
    /// What the last prompt cost, measured before sending.
    private(set) var usage: ContextUsage?
    /// The whole session after the last answer, counted by the model. `nil` before iOS 26.4.
    private(set) var transcriptTokens: Int?
    private(set) var compactions = 0
    private(set) var overflowRetries = 0
    private(set) var lastEvent: String?

    var isResponding: Bool { task != nil }

    nonisolated static let maximumResponseTokens = 600
    nonisolated static let toolTokenReserve = 150

    private let context: ModelContext
    private let counter = TokenCounter()
    @ObservationIgnored private var session: LanguageModelSession?
    @ObservationIgnored private var task: Task<Void, Never>?
    /// `nil` until the model has said, which is never if the answer was stopped.
    @ObservationIgnored private var streamingIsMedical: Bool?
    /// Filled by the model's tool while it answers; read when the answer is finished.
    @ObservationIgnored private let proposals = ProposalInbox()
    /// False for a question sent on from an emergency card ("this isn't happening now").
    @ObservationIgnored private var proposalsAllowed = true
    /// The profile changed during an answer, so the session is replaced after it.
    @ObservationIgnored private var profileIsStale = false
    /// Turns don't change once saved, so each is counted once.
    @ObservationIgnored private var turnTokenCache: [ChatHistory.Turn: Int] = [:]

    init(child: Child, conversation: Conversation?, context: ModelContext) {
        self.child = child
        self.conversation = conversation
        self.context = context
        // A reopened chat whose last question went unanswered shows why, with Try again where it helps.
        if let last = conversation?.sortedMessages.last, last.role == .user {
            failure = last.failure
        }
    }

    /// Saved messages, oldest first.
    var messages: [Message] {
        conversation?.sortedMessages ?? []
    }

    var budget: ContextBudget {
        var budget = ContextBudget(contextSize: SystemLanguageModel.default.contextSize)
        budget.answerReserve = Self.maximumResponseTokens + SafeAnswer.schemaTokenReserve
        budget.toolReserve = Self.toolTokenReserve
        #if DEBUG
        // Developer tools can pretend the window is smaller, to see compaction after a few questions.
        let override = UserDefaults.standard.integer(forKey: DebugKeys.contextSizeOverride)
        if override > 0 { budget.contextSize = override }
        #endif
        return budget
    }

    /// Loads the model and the instructions before she starts typing, for a faster first word.
    func prewarm() {
        guard session == nil, SystemLanguageModel.default.isAvailable else { return }
        let session = makeSession()
        session.prewarm()
        self.session = session
    }

    func send(_ text: String) {
        let question = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty, !isResponding else { return }
        proposalsAllowed = true

        let conversation = self.conversation ?? startConversation(title: ConversationTitle.make(from: question))
        let message = Message(role: .user, text: question)
        // The gate comes first: a red flag never reaches the model.
        let topic = EmergencyGate.emergency(in: question, context: GateContext(child: child))
        message.emergency = topic
        append(message, to: conversation)
        if let topic {
            failure = nil
            presentedEmergency = topic
        } else {
            respond(to: question)
        }
    }

    /// From the card: "this isn't happening now". The only way a red-flag message reaches the model.
    func askAnyway() {
        presentedEmergency = nil
        guard !isResponding, let last = messages.last, last.role == .user, last.emergency != nil else { return }
        last.emergency = nil
        proposalsAllowed = false
        save()
        respond(to: last.text)
    }

    /// Only the latest question can still be sent to the model from its card.
    var canAskAnyway: Bool {
        messages.last?.emergency != nil && !isResponding
    }

    /// Asks the last question again after a failure.
    func retry() {
        guard let failure, failure.canRetry, !isResponding,
              let last = messages.last, last.role == .user else { return }
        respond(to: last.text)
    }

    /// Keeps whatever has arrived so far.
    func stop() {
        task?.cancel()
    }

    /// The profile was edited or the baby was born: the next answer uses the new profile block.
    /// An answer in progress finishes with the old one.
    func profileDidChange() {
        guard !isResponding else {
            profileIsStale = true
            return
        }
        session = nil
        prewarm()
    }

    /// The card's Save button: the only way a fact from the chat reaches the profile.
    func saveProposal(on message: Message) {
        guard ProfileNotes.save(proposalOn: message, child: child, in: context) else { return }
        save()
        profileDidChange()
    }

    func dismissProposal(on message: Message) {
        ProfileNotes.dismiss(proposalOn: message)
        save()
    }

    /// Before switching to another conversation or child.
    func close() {
        task?.cancel()
    }

    // MARK: Private

    private func respond(to question: String) {
        failure = nil
        streamingText = ""
        streamingIsMedical = nil
        _ = proposals.drain()
        task = Task { [weak self] in
            await self?.run(question, isRetry: false)
        }
    }

    private func run(_ question: String, isRetry: Bool) async {
        do {
            let session = try await prepareSession(for: question, compactEverything: isRetry)
            try Task.checkCancellation()
            let options = GenerationOptions(maximumResponseTokens: Self.maximumResponseTokens)
            for try await snapshot in session.streamResponse(to: question, generating: SafeAnswer.self, options: options) {
                guard !Task.isCancelled else { break }
                streamingText = snapshot.content.answer ?? ""
                streamingIsMedical = snapshot.content.isMedical
            }
            finish(failure: nil)
        } catch is CancellationError {
            finish(failure: nil)
        } catch let error as LanguageModelSession.GenerationError where !isRetry && error.isContextOverflow {
            // Our count was off, or the answer ran long. Compact everything and try once more;
            // the half-written answer is thrown away.
            overflowRetries += 1
            lastEvent = "overflow → compact all + retry"
            streamingText = ""
            session = nil
            _ = proposals.drain()
            await run(question, isRetry: true)
        } catch {
            finish(failure: ChatFailure(error))
        }
    }

    /// The session to ask `question` in, compacting first if the prompt wouldn't fit.
    private func prepareSession(for question: String, compactEverything: Bool) async throws -> LanguageModelSession {
        let budget = self.budget
        var usage = await measure(question: question, budget: budget)
        if compactEverything || !usage.fits {
            try await compact(question: question, budget: budget, keepShare: compactEverything ? 0 : nil)
            usage = await measure(question: question, budget: budget)
        }
        self.usage = usage

        if session?.isResponding == true { session = nil }
        let session = self.session ?? makeSession()
        self.session = session
        return session
    }

    /// The uncompacted turns, oldest first.
    private var liveTurns: [ChatHistory.Turn] {
        let saved = messages.map { (role: $0.role, text: $0.text) }
        return ChatHistory.turns(from: saved, startingAt: conversation?.summarizedMessageCount ?? 0)
    }

    private func instructions(summary: String?) -> String {
        SessionPrompt.instructions(for: child, in: context, earlierSummary: summary)
    }

    private func tokens(for turn: ChatHistory.Turn) async -> Int {
        if let cached = turnTokenCache[turn] { return cached }
        let tokens = await counter.count(turn: turn)
        turnTokenCache[turn] = tokens
        return tokens
    }

    private func measure(question: String, budget: ContextBudget) async -> ContextUsage {
        let summary = conversation?.summary
        let turns = liveTurns
        var history = 0
        for turn in turns { history += await tokens(for: turn) }
        let instructions = await counter.count(instructions: instructions(summary: summary))
        let summaryTokens = summary.map { TokenCounter.estimate($0) } ?? 0
        return ContextUsage(
            instructions: instructions,
            summary: summaryTokens,
            history: history,
            turns: turns.count,
            question: await counter.count(prompt: question),
            contextSize: budget.contextSize,
            promptLimit: budget.promptLimit,
            isExact: counter.isExact
        )
    }

    /// Folds the oldest turns into the conversation's summary and drops the session, so the next
    /// one starts from the summary. If the summarizer declines, those turns are dropped anyway and
    /// the old summary stays: losing a little memory beats showing an error.
    private func compact(question: String, budget: ContextBudget, keepShare: Double?) async throws {
        guard let conversation else { return }
        let turns = liveTurns
        var turnTokens: [Int] = []
        for turn in turns { turnTokens.append(await tokens(for: turn)) }
        let base = await counter.count(instructions: instructions(summary: nil))
        let questionTokens = await counter.count(prompt: question)
        let count = budget.turnsToCompact(turnTokens: turnTokens, baseInstructions: base, question: questionTokens, keepShare: keepShare)
        guard count > 0 else {
            lastEvent = "nothing to compact (question \(questionTokens) tok)"
            return
        }

        let folded = Array(turns.prefix(count))
        let clock = ContinuousClock()
        let start = clock.now
        var notes = conversation.summary
        var declined = 0
        let batches = Compactor.batches(folded, contextSize: SystemLanguageModel.default.contextSize)
        for batch in batches {
            if let updated = try await Compactor.summarize(previous: notes, turns: batch) {
                notes = updated
            } else {
                declined += 1
            }
            try Task.checkCancellation()
        }
        let seconds = (clock.now - start).formatted(.units(allowed: [.seconds], fractionalPart: .show(length: 1)))

        conversation.summary = notes
        conversation.summarizedMessageCount = folded.last?.end ?? conversation.summarizedMessageCount
        save()
        session = nil
        compactions += 1
        lastEvent = "compacted \(count) turns in \(batches.count) call(s)"
            + (declined > 0 ? ", \(declined) declined" : "")
            + " → ≈\(TokenCounter.estimate(notes ?? "")) tok summary (\(seconds))"
    }

    private func finish(failure: ChatFailure?) {
        let wasStopped = task?.isCancelled == true
        let text = (streamingText ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let question = messages.last { $0.role == .user }
        let proposed = proposals.drain()
        if let conversation, !text.isEmpty {
            question?.failure = nil
            question?.support = nil
            let answer = Message(role: .assistant, text: text)
            // No verdict from the model (a stopped answer) gets the disclaimer: the safer default.
            answer.showsDisclaimer = streamingIsMedical ?? true
            answer.support = question.flatMap { EmergencyGate.support(in: $0.text) }
            if !wasStopped, failure == nil, let question {
                answer.noteProposal = acceptedProposal(from: proposed, question: question.text, conversation: conversation)
            }
            append(answer, to: conversation)
        } else if let failure, let question, messages.last === question {
            // Saved so the chat still explains the gap after it's reopened.
            question.failure = failure
            question.support = EmergencyGate.support(in: question.text)
            save()
        }
        // After a stop or an error the session's transcript no longer matches what was saved.
        // A tool call also takes up room that the saved messages don't account for.
        if wasStopped || failure != nil || !proposed.isEmpty || profileIsStale { session = nil }
        profileIsStale = false
        self.failure = text.isEmpty ? failure : nil
        streamingText = nil
        task = nil
        #if DEBUG
        if let transcript = session?.transcript {
            Task { [weak self, counter] in
                let tokens = await counter.count(transcript: transcript)
                self?.transcriptTokens = tokens
            }
        }
        #endif
    }

    private func acceptedProposal(from proposed: [ProfileProposal], question: String, conversation: Conversation) -> ProfileProposal? {
        guard proposalsAllowed, child.stage != .archived else { return nil }
        let mom = (try? context.fetch(FetchDescriptor<MomProfile>()))?.first
        let known = ProfileNotes.knownFacts(child: child, mom: mom, conversation: conversation)
        return ProposalFilter.accepted(proposed, question: question, childName: child.name, knownFacts: known)
    }

    private func makeSession() -> LanguageModelSession {
        // After a loss the model doesn't collect facts about the pregnancy.
        let tool = child.stage == .archived ? nil : ProposeProfileUpdateTool(inbox: proposals)
        let transcript = ChatHistory.transcript(
            instructions: instructions(summary: conversation?.summary),
            turns: liveTurns,
            toolDefinitions: tool.map { [Transcript.ToolDefinition(tool: $0)] } ?? []
        )
        return LanguageModelSession(model: .default, tools: tool.map { [$0] } ?? [], transcript: transcript)
    }

    private func startConversation(title: String) -> Conversation {
        let conversation = Conversation(child: child)
        conversation.title = title
        context.insert(conversation)
        self.conversation = conversation
        return conversation
    }

    private func append(_ message: Message, to conversation: Conversation) {
        context.insert(message)
        message.conversation = conversation
        conversation.updatedAt = message.createdAt
        save()
    }

    private func save() {
        do {
            try context.save()
        } catch {
            assertionFailure("Couldn't save the chat: \(error)")
        }
    }
}

extension GateContext {
    init(child: Child, on date: Date = .now, calendar: Calendar = .current) {
        switch child.stage {
        case .expecting:
            self = .expecting(weeks: child.pregnancy(on: date, calendar: calendar)?.weeks)
        case .born:
            if let birthDate = child.birthDate {
                self = .baby(ageDays: max(calendar.daysBetween(birthDate, date), 0))
            } else {
                self = .unknown
            }
        case .archived:
            self = .unknown
        }
    }
}

extension LanguageModelSession.GenerationError {
    var isContextOverflow: Bool {
        if case .exceededContextWindowSize = self { return true }
        return false
    }
}
