import Foundation
import SwiftData

/// A conversation's title is its first question, shortened. No extra model call.
nonisolated enum ConversationTitle {
    static let maxLength = 60

    static func make(from question: String) -> String {
        let firstLine = question
            .split(whereSeparator: \.isNewline)
            .first
            .map { $0.trimmingCharacters(in: .whitespaces) } ?? ""
        guard firstLine.count > maxLength else { return firstLine }
        let cut = firstLine.prefix(maxLength)
        // Break at the last space so a word isn't cut in half, unless that loses too much.
        if let space = cut.lastIndex(of: " "), cut.distance(from: cut.startIndex, to: space) > maxLength / 2 {
            return String(cut[..<space]) + "…"
        }
        return String(cut) + "…"
    }
}

/// Which chat opens when the app starts or the child changes.
enum ConversationResume {
    /// A chat touched within this window is "still going"; after it a fresh chat starts.
    static let window: TimeInterval = 6 * 60 * 60

    /// `history` is newest first, as `Child.history(in:)` returns it.
    static func conversation(from history: [Conversation], now: Date = .now) -> Conversation? {
        guard let latest = history.first, now.timeIntervalSince(latest.updatedAt) < window else { return nil }
        return latest
    }

    /// Back from the background: the open chat went quiet longer than `window` ago, so it's
    /// time for a fresh one, the same as at launch. An empty, unsaved chat is already fresh.
    static func isStale(_ current: Conversation?, now: Date = .now) -> Bool {
        guard let current else { return false }
        return now.timeIntervalSince(current.updatedAt) >= window
    }
}

/// Search over a child's chats: titles and every message.
enum ConversationSearch {
    struct Hit: Identifiable {
        let conversation: Conversation
        /// The matching message, shown under the title. `nil` when only the title matched.
        let snippet: String?

        var id: PersistentIdentifier { conversation.persistentModelID }
    }

    static func search(_ query: String, in history: [Conversation]) -> [Hit] {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else {
            return history.map { Hit(conversation: $0, snippet: nil) }
        }
        return history.compactMap { conversation in
            let match = conversation.sortedMessages.first { $0.text.localizedStandardContains(query) }
            if let match { return Hit(conversation: conversation, snippet: snippet(match.text, around: query)) }
            if conversation.title?.localizedStandardContains(query) == true { return Hit(conversation: conversation, snippet: nil) }
            return nil
        }
    }

    /// A short piece of `text` with the match near the start, on one line.
    static func snippet(_ text: String, around query: String, length: Int = 90) -> String {
        let flat = text.replacingOccurrences(of: "\n", with: " ")
        guard let range = flat.range(of: query, options: [.caseInsensitive, .diacriticInsensitive]) else {
            return String(flat.prefix(length))
        }
        let start = flat.index(range.lowerBound, offsetBy: -20, limitedBy: flat.startIndex) ?? flat.startIndex
        let end = flat.index(start, offsetBy: length, limitedBy: flat.endIndex) ?? flat.endIndex
        let piece = flat[start..<end].trimmingCharacters(in: .whitespaces)
        return (start > flat.startIndex ? "…" : "") + piece + (end < flat.endIndex ? "…" : "")
    }
}
