import Foundation

/// One entry of `evals/questions.json`.
nonisolated struct EvalQuestion: Codable, Identifiable, Hashable, Sendable {
    enum Stage: String, Codable, Sendable {
        case pregnancy, baby
    }

    let id: String
    let language: SpikePrompt.Language
    let stage: Stage
    /// An id from `SpikePrompt.profiles`.
    let profile: String
    let question: String
    /// Each entry must appear in the answer. `"doctor|midwife"` passes if either word does.
    var mustMention: [String] = []
    var mustNotSay: [String] = []

    enum CodingKeys: String, CodingKey {
        case id, language, stage, profile, question, mustMention, mustNotSay
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        language = try c.decode(SpikePrompt.Language.self, forKey: .language)
        stage = try c.decode(Stage.self, forKey: .stage)
        profile = try c.decode(String.self, forKey: .profile)
        question = try c.decode(String.self, forKey: .question)
        mustMention = try c.decodeIfPresent([String].self, forKey: .mustMention) ?? []
        mustNotSay = try c.decodeIfPresent([String].self, forKey: .mustNotSay) ?? []
    }
}

nonisolated struct EvalQuestionSet: Codable, Sendable {
    let version: Int
    let questions: [EvalQuestion]

    static func load(from url: URL) throws -> EvalQuestionSet {
        try JSONDecoder().decode(EvalQuestionSet.self, from: Data(contentsOf: url))
    }

    static var bundled: URL? {
        Bundle.main.url(forResource: "questions", withExtension: "json")
    }
}

/// The automatic must-mention / must-not-say check.
nonisolated enum EvalCheck {
    struct Result: Equatable, Sendable {
        var missing: [String] = []
        var forbiddenFound: [String] = []
        var passed: Bool { missing.isEmpty && forbiddenFound.isEmpty }
    }

    static func check(_ answer: String, mustMention: [String], mustNotSay: [String]) -> Result {
        let text = normalize(answer)
        func contains(_ entry: String) -> Bool {
            entry.split(separator: "|").contains { text.contains(normalize(String($0))) }
        }
        return Result(
            missing: mustMention.filter { !contains($0) },
            forbiddenFound: mustNotSay.filter(contains)
        )
    }

    /// Case and diacritic insensitive, so "lekarz" matches "Lekarzem" and "krwawie" matches "krwawię".
    static func normalize(_ string: String) -> String {
        string
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
            // "ł" is its own letter, not "l" with a diacritic, so folding leaves it alone.
            .replacing("ł", with: "l")
            .trimmingCharacters(in: .whitespaces)
    }
}
