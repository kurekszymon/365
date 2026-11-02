import Foundation
import FoundationModels

/// Folds the oldest turns of a long chat into short notes, with one extra model call.
/// The notes go into the instructions of a fresh session (`Instructions.make(earlierSummary:)`).
nonisolated enum Compactor {
    static let maximumSummaryTokens = 250
    /// Answers are the long part; their first lines carry the point. Keeps the summarizer's own
    /// prompt well inside the context even when everything is compacted at once.
    static let questionClip = 400
    static let answerClip = 700

    static let instructions = """
        You keep notes on an earlier part of a chat between a mom and MomChat, a midwife assistant. \
        The notes replace those messages, so keep only what matters for later answers:
        - facts about her, her pregnancy or her child: symptoms, dates, ages, foods, feeding, sleep, what she tried, what a doctor said
        - what she asked about and the key advice she was given
        - anything still open or worrying her
        Write at most 120 words as short bullets starting with "- ". Plain English. Call her "she" and use the child's name if it was used. \
        Only write what is in the chat. Don't add advice or opinions.
        """

    /// The prompt for the summarizer: the notes so far, then the turns to fold in.
    static func prompt(previous: String?, turns: [ChatHistory.Turn]) -> String {
        var parts: [String] = []
        if let previous, !previous.isEmpty {
            parts.append("Notes so far:\n\(previous)")
        }
        let chat = turns.map { turn in
            "Mom: \(clip(turn.question, to: questionClip))\nMomChat: \(clip(turn.answer, to: answerClip))"
        }
        parts.append("Newer messages:\n\(chat.joined(separator: "\n\n"))")
        parts.append(previous == nil ? "Write the notes." : "Write the updated notes, merging the notes so far with the newer messages.")
        return parts.joined(separator: "\n\n")
    }

    /// Splits the turns to fold in into groups that each fit one summarizer call: its instructions,
    /// the notes so far and the answer all have to fit the context too. Usually one group; more
    /// only for a long chat saved before compaction existed, or a much smaller pretend context.
    static func batches(_ turns: [ChatHistory.Turn], contextSize: Int) -> [[ChatHistory.Turn]] {
        let fixed = TokenCounter.estimate(instructions) + 2 * maximumSummaryTokens + 100
        let room = max(contextSize - fixed, 1)
        var batches: [[ChatHistory.Turn]] = []
        var current: [ChatHistory.Turn] = []
        var used = 0
        for turn in turns {
            let tokens = TokenCounter.estimate(clip(turn.question, to: questionClip)) + TokenCounter.estimate(clip(turn.answer, to: answerClip))
            if !current.isEmpty, used + tokens > room {
                batches.append(current)
                current = []
                used = 0
            }
            current.append(turn)
            used += tokens
        }
        if !current.isEmpty { batches.append(current) }
        return batches
    }

    /// The new notes, or `nil` if the model wouldn't (guardrail, unsupported language, busy).
    /// The caller then drops the turns and keeps the old notes: losing some memory beats an error.
    static func summarize(previous: String?, turns: [ChatHistory.Turn]) async throws -> String? {
        let session = LanguageModelSession(model: .default, tools: [], instructions: instructions)
        let options = GenerationOptions(sampling: .greedy, maximumResponseTokens: maximumSummaryTokens)
        do {
            let response = try await session.respond(to: prompt(previous: previous, turns: turns), options: options)
            let notes = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
            return notes.isEmpty ? nil : notes
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            return nil
        }
    }

    static func clip(_ text: String, to length: Int) -> String {
        let flat = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard flat.count > length else { return flat }
        return String(flat.prefix(length)) + "…"
    }
}
