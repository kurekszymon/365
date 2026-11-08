import Foundation
import FoundationModels

/// Turns saved messages back into a session transcript, so a reopened chat remembers what was said.
/// What doesn't fit is compacted into a summary first (`ContextBudget`, `Compactor`).
nonisolated enum ChatHistory {
    struct Turn: Hashable, Sendable {
        var question: String
        var answer: String
        /// Index just past this turn's answer in the full message list. Saved as
        /// `Conversation.summarizedMessageCount` when the turn is compacted.
        var end: Int = 0
    }

    /// Pairs each question with the answer after it, starting at message `start` (the ones before
    /// are covered by the summary). A question with no answer (stopped before the first word, or
    /// refused) is skipped, as is an answer with no question.
    static func turns(from messages: [(role: Message.Role, text: String)], startingAt start: Int = 0) -> [Turn] {
        var turns: [Turn] = []
        var pending: String?
        for index in messages.indices where index >= start {
            let message = messages[index]
            switch message.role {
            case .user:
                pending = message.text
            case .assistant:
                if let question = pending, !message.text.isEmpty {
                    turns.append(Turn(question: question, answer: message.text, end: index + 1))
                }
                pending = nil
            }
        }
        return turns
    }

    /// A session built from a transcript only offers the model the tools declared in it, so
    /// `toolDefinitions` has to match the session's `tools`.
    static func transcript(instructions: String, turns: [Turn], toolDefinitions: [Transcript.ToolDefinition] = []) -> Transcript {
        Transcript(entries: [instructionsEntry(instructions, toolDefinitions: toolDefinitions)] + turns.flatMap(entries(for:)))
    }

    static func instructionsEntry(_ text: String, toolDefinitions: [Transcript.ToolDefinition] = []) -> Transcript.Entry {
        .instructions(Transcript.Instructions(segments: [.text(.init(content: text))], toolDefinitions: toolDefinitions))
    }

    static func promptEntry(_ text: String) -> Transcript.Entry {
        .prompt(Transcript.Prompt(segments: [.text(.init(content: text))]))
    }

    static func entries(for turn: Turn) -> [Transcript.Entry] {
        [
            promptEntry(turn.question),
            .response(Transcript.Response(assetIDs: [], segments: [.text(.init(content: turn.answer))])),
        ]
    }
}
