import Foundation
import FoundationModels
import Observation
import SwiftData

/// One open conversation: sends questions, streams answers, saves both. One `LanguageModelSession`
/// per conversation; it's rebuilt from the saved messages when the chat is reopened, or after an
/// error or a stop, so the model always sees exactly what's on screen.
@Observable
final class ChatController {
    let child: Child
    /// `nil` until the first question: an empty chat isn't saved and doesn't show up in the history.
    private(set) var conversation: Conversation?
    /// The answer while it streams. `nil` when nothing is being generated.
    private(set) var streamingText: String?
    /// Why the last answer didn't come. Cleared by the next question or a retry.
    private(set) var failure: ChatFailure?

    var isResponding: Bool { task != nil }

    static let maximumResponseTokens = 600

    private let context: ModelContext
    @ObservationIgnored private var session: LanguageModelSession?
    @ObservationIgnored private var task: Task<Void, Never>?

    init(child: Child, conversation: Conversation?, context: ModelContext) {
        self.child = child
        self.conversation = conversation
        self.context = context
    }

    /// Saved messages, oldest first.
    var messages: [Message] {
        conversation?.sortedMessages ?? []
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

        let conversation = self.conversation ?? startConversation(title: ConversationTitle.make(from: question))
        append(Message(role: .user, text: question), to: conversation)
        respond(to: question)
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
        guard !isResponding else { return }
        session = nil
        prewarm()
    }

    /// Before switching to another conversation or child.
    func close() {
        task?.cancel()
    }

    // MARK: Private

    private func respond(to question: String) {
        failure = nil
        streamingText = ""
        if session?.isResponding == true { session = nil }
        let session = self.session ?? makeSession()
        self.session = session
        let options = GenerationOptions(maximumResponseTokens: Self.maximumResponseTokens)

        task = Task { [weak self] in
            do {
                for try await snapshot in session.streamResponse(to: question, options: options) {
                    guard let self, !Task.isCancelled else { break }
                    self.streamingText = snapshot.content
                }
                self?.finish(failure: nil)
            } catch is CancellationError {
                self?.finish(failure: nil)
            } catch {
                self?.finish(failure: ChatFailure(error))
            }
        }
    }

    private func finish(failure: ChatFailure?) {
        let wasStopped = task?.isCancelled == true
        let text = (streamingText ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if let conversation, !text.isEmpty {
            append(Message(role: .assistant, text: text), to: conversation)
        }
        // After a stop or an error the session's transcript no longer matches what was saved.
        if wasStopped || failure != nil { session = nil }
        self.failure = text.isEmpty ? failure : nil
        streamingText = nil
        task = nil
    }

    private func makeSession() -> LanguageModelSession {
        let instructions = SessionPrompt.instructions(for: child, in: context)
        let saved = messages.map { (role: $0.role, text: $0.text) }
        let transcript = ChatHistory.transcript(instructions: instructions, turns: ChatHistory.turns(from: saved))
        return LanguageModelSession(model: .default, tools: [], transcript: transcript)
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
        do {
            try context.save()
        } catch {
            assertionFailure("Couldn't save the message: \(error)")
        }
    }
}
