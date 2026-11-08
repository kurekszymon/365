import Foundation

/// Decides whether a proposal is worth a card. The model's judgment is the first filter; this one
/// catches what's checkable in code, so a wrong guess doesn't cost her a tap.
enum ProposalFilter {
    /// A longer note would be cut off in the profile block.
    static let maximumLength = ProfileBlock.itemLength

    /// The first proposal worth showing, cleaned up, or `nil`.
    /// - Parameters:
    ///   - knownFacts: already in the profile, or already offered in this chat (even if dismissed).
    static func accepted(_ proposals: [ProfileProposal], question: String, childName: String?, knownFacts: [String]) -> ProfileProposal? {
        // Grief or a crisis is never turned into a profile note by the model.
        guard EmergencyGate.support(in: question) == nil else { return nil }
        for proposal in proposals {
            let fact = clean(proposal.fact)
            guard (3...maximumLength).contains(fact.count), !fact.contains("?"),
                  isGrounded(fact, in: question, childName: childName),
                  !isKnown(fact, among: knownFacts) else { continue }
            return ProfileProposal(fact: fact, subject: proposal.subject)
        }
        return nil
    }

    private static func clean(_ text: String) -> String {
        text.replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines.union(CharacterSet(charactersIn: ".\"")))
    }

    /// At least one meaningful word of the fact has to come from her message, so the model can't
    /// offer something she never said. Word starts are compared: "egg" matches "eggs".
    private static func isGrounded(_ fact: String, in question: String, childName: String?) -> Bool {
        var ignored = fillerWords
        if let childName { ignored.insert(normalize(childName)) }
        let said = words(question).subtracting(ignored)
        return words(fact).subtracting(ignored).contains { word in
            said.contains { word.commonPrefix(with: $0).count >= min(4, word.count, $0.count) }
        }
    }

    private static func isKnown(_ fact: String, among known: [String]) -> Bool {
        let fact = normalize(fact)
        return known.map(normalize).contains { $0.count >= 3 && (fact.contains($0) || $0.contains(fact)) }
    }

    private static func words(_ text: String) -> Set<String> {
        Set(normalize(text).split { !$0.isLetter }.map(String.init).filter { $0.count >= 3 })
    }

    private static func normalize(_ text: String) -> String {
        text.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Words that say nothing about the fact itself.
    private static let fillerWords: Set<String> = [
        "after", "and", "baby", "child", "first", "for", "had", "has", "her", "him", "his", "likely", "maybe",
        "mom", "new", "not", "possible", "she", "the", "was", "with",
    ]
}
