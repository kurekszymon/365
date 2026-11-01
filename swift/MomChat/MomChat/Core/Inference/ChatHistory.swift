import Foundation
import FoundationModels

/// Turns saved messages back into a session transcript, so a reopened chat remembers what was said.
/// Stage 7 replaces the simple cut-off below with summaries.
nonisolated enum ChatHistory {
    struct Turn: Equatable, Sendable {
        var question: String
        var answer: String
    }

    /// Roughly 1 token per 4 characters. Leaves room for instructions (~650) and the answer (~600) in ~4K.
    static let characterBudget = 8_000

    /// Pairs each question with the answer after it. A question with no answer (stopped before the
    /// first word, or refused) is skipped, as is an answer with no question. Keeps the newest turns
    /// that fit in `budget` characters.
    static func turns(from messages: [(role: Message.Role, text: String)], budget: Int = characterBudget) -> [Turn] {
        var turns: [Turn] = []
        var pending: String?
        for message in messages {
            switch message.role {
            case .user:
                pending = message.text
            case .assistant:
                if let question = pending, !message.text.isEmpty {
                    turns.append(Turn(question: question, answer: message.text))
                }
                pending = nil
            }
        }

        var kept: [Turn] = []
        var used = 0
        for turn in turns.reversed() {
            used += turn.question.count + turn.answer.count
            guard used <= budget else { break }
            kept.append(turn)
        }
        return kept.reversed()
    }

    static func transcript(instructions: String, turns: [Turn]) -> Transcript {
        var entries: [Transcript.Entry] = [
            .instructions(Transcript.Instructions(segments: [.text(.init(content: instructions))], toolDefinitions: [])),
        ]
        for turn in turns {
            entries.append(.prompt(Transcript.Prompt(segments: [.text(.init(content: turn.question))])))
            entries.append(.response(Transcript.Response(assetIDs: [], segments: [.text(.init(content: turn.answer))])))
        }
        return Transcript(entries: entries)
    }
}
