import Foundation
import FoundationModels

/// How the model's context window is shared (PLAN.md, Context Budget):
/// instructions + profile + summary, tool definitions, history, the new question, and room for the answer.
nonisolated struct ContextBudget: Equatable, Sendable {
    /// The whole window, ~4K tokens on today's model.
    var contextSize: Int
    /// Kept free for the answer. Matches `ChatController.maximumResponseTokens`.
    var answerReserve = 600
    /// Tool definitions. `ChatController` sets ~150 for `proposeProfileUpdate`.
    var toolReserve = 0
    /// What a summary may grow to (`Compactor.maximumSummaryTokens`).
    var summaryReserve = 250
    /// After compacting, the newest turns kept word for word use at most this share of the room
    /// for history, so the next few questions fit without another compaction.
    var keepShare = 0.4

    /// Everything sent in (instructions, history, question) has to stay under this.
    var promptLimit: Int { contextSize - answerReserve - toolReserve }

    /// Which turns to fold into the summary so the question fits.
    ///
    /// - Parameters:
    ///   - turnTokens: tokens per uncompacted turn, oldest first.
    ///   - baseInstructions: instructions + profile, without any summary.
    ///   - question: the new question.
    ///   - keepShare: overrides `keepShare`; 0 compacts every turn (the retry after an overflow).
    /// - Returns: how many of the oldest turns to compact. The rest are kept word for word.
    func turnsToCompact(turnTokens: [Int], baseInstructions: Int, question: Int, keepShare: Double? = nil) -> Int {
        let room = promptLimit - baseInstructions - summaryReserve - question
        let keepRoom = Int(Double(max(room, 0)) * (keepShare ?? self.keepShare))
        var kept = 0
        var used = 0
        for tokens in turnTokens.reversed() {
            guard used + tokens <= keepRoom else { break }
            used += tokens
            kept += 1
        }
        return turnTokens.count - kept
    }
}

/// What the next prompt costs, for the plan and the debug overlay.
nonisolated struct ContextUsage: Equatable, Sendable {
    var instructions: Int
    /// Part of `instructions`: the summary of older messages.
    var summary: Int
    var history: Int
    var turns: Int
    var question: Int
    var contextSize: Int
    var promptLimit: Int
    /// False when counted with the characters estimate (iOS before 26.4).
    var isExact: Bool

    var total: Int { instructions + history + question }
    var fits: Bool { total <= promptLimit }
}

/// Counts tokens with the model's own tokenizer when the OS has it (iOS 26.4), otherwise estimates.
nonisolated struct TokenCounter: Sendable {
    /// Turn off in tests, so they don't need the model.
    var usesModel = true

    var isExact: Bool {
        guard usesModel else { return false }
        if #available(iOS 26.4, *) { return true }
        return false
    }

    func count(instructions text: String) async -> Int {
        await count([ChatHistory.instructionsEntry(text)], estimate: Self.estimate(text))
    }

    func count(prompt text: String) async -> Int {
        await count([ChatHistory.promptEntry(text)], estimate: Self.estimate(text))
    }

    func count(turn: ChatHistory.Turn) async -> Int {
        await count(ChatHistory.entries(for: turn), estimate: Self.estimate(turn.question) + Self.estimate(turn.answer))
    }

    func count(transcript: Transcript) async -> Int? {
        guard usesModel else { return nil }
        if #available(iOS 26.4, *) {
            return try? await SystemLanguageModel.default.tokenCount(for: transcript)
        }
        return nil
    }

    /// Deliberately on the high side: about 3 characters per token (English runs nearer 4),
    /// plus a few tokens of framing per entry.
    static func estimate(_ text: String) -> Int {
        (text.count + 2) / 3 + 4
    }

    private func count(_ entries: [Transcript.Entry], estimate: Int) async -> Int {
        guard usesModel else { return estimate }
        if #available(iOS 26.4, *), let exact = try? await SystemLanguageModel.default.tokenCount(for: entries) {
            return exact
        }
        return estimate
    }
}
