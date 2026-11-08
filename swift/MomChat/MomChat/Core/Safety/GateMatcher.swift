import Foundation

/// A message reduced to what the gate compares: lowercase, no diacritics, no apostrophes, words only.
/// "Krwawię!" → ["krwawie"], "isn't" → ["isnt"].
nonisolated struct GateText: Sendable {
    /// Folded text with punctuation kept, for reading temperatures.
    let folded: String
    let words: [String]

    init(_ raw: String) {
        folded = raw
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
            // "ł" is its own letter, not "l" with a diacritic, so folding leaves it alone.
            .replacing("ł", with: "l")
            .replacing("’", with: "'")
        words = folded
            .replacing("'", with: "")
            .split { !$0.isLetter && !$0.isNumber }
            .map(String.init)
    }

    func contains(any patterns: [GatePattern]) -> Bool {
        patterns.contains { $0.matches(words) }
    }
}

/// One phrase, written for a scared mom's typing:
/// - words separated by spaces must follow each other: `not breathing`
/// - `a|b` either word: `isnt|not breathing`
/// - `stem*` any ending: `krwawi*`
/// - `..` up to three other words in between: `lips .. blue`
///
/// Longer words also match with one typo ("breating", "bleedng").
nonisolated struct GatePattern: Sendable, ExpressibleByStringLiteral {
    private enum Term: Sendable {
        case word(String)
        case stem(String)
    }

    private enum Step: Sendable {
        case terms([Term])
        case gap
    }

    private let steps: [Step]
    private static let maximumGap = 3
    /// Shorter words stay exact: at this size one typo usually makes a different word.
    private static let fuzzyMinimumLength = 6
    private static let fuzzyStemMinimumLength = 5
    /// Real words one typo away from a phrase word. They never count as that typo.
    private static let neverTypos: Set<String> = [
        "cooking", "blending", "breeding", "bleating", "breathy",
        "fainter", "sweating", "wounded",
    ]

    init(stringLiteral value: String) {
        steps = value.split(separator: " ").map { part in
            if part == ".." { return .gap }
            return .terms(part.split(separator: "|").map { term in
                term.hasSuffix("*") ? .stem(String(term.dropLast())) : .word(String(term))
            })
        }
    }

    func matches(_ words: [String]) -> Bool {
        words.indices.contains { matches(words, from: $0, step: 0) }
    }

    private func matches(_ words: [String], from index: Int, step: Int) -> Bool {
        guard step < steps.count else { return true }
        switch steps[step] {
        case .gap:
            return (0...Self.maximumGap).contains { skipped in
                index + skipped <= words.count && matches(words, from: index + skipped, step: step + 1)
            }
        case .terms(let terms):
            guard index < words.count, terms.contains(where: { Self.matches(words[index], $0) }) else { return false }
            return matches(words, from: index + 1, step: step + 1)
        }
    }

    private static func matches(_ word: String, _ term: Term) -> Bool {
        switch term {
        case .word(let target):
            if word == target { return true }
            return target.count >= fuzzyMinimumLength && isTypo(of: target, word)
        case .stem(let stem):
            if word.hasPrefix(stem) { return true }
            guard stem.count >= fuzzyStemMinimumLength else { return false }
            // The typo may have added or dropped a letter, so try the word's start at three lengths.
            return (stem.count - 1...stem.count + 1).contains { length in
                length <= word.count && isTypo(of: stem, String(word.prefix(length)))
            } && !neverTypos.contains(word)
        }
    }

    private static func isTypo(of target: String, _ word: String) -> Bool {
        guard word.first == target.first, !neverTypos.contains(word) else { return false }
        return editDistanceIsAtMostOne(Array(target), Array(word))
    }

    /// One inserted, dropped, replaced or swapped letter at most.
    private static func editDistanceIsAtMostOne(_ a: [Character], _ b: [Character]) -> Bool {
        guard abs(a.count - b.count) <= 1 else { return false }
        var i = 0
        while i < a.count, i < b.count, a[i] == b[i] { i += 1 }
        if i == a.count || i == b.count { return true }
        if a.count == b.count {
            if a[(i + 1)...] == b[(i + 1)...] { return true }
            return i + 1 < a.count && a[i] == b[i + 1] && a[i + 1] == b[i] && a[(i + 2)...] == b[(i + 2)...]
        }
        return a.count > b.count ? a[(i + 1)...] == b[i...] : a[i...] == b[(i + 1)...]
    }
}

/// Finds a temperature in a message, in °C or °F, without mistaking "38 weeks" for one.
nonisolated enum GateTemperature {
    /// °C, or `nil` if the message doesn't state a fever-range temperature.
    static func celsius(in text: GateText) -> Double? {
        let hasFeverWord = text.words.contains { word in
            feverWords.contains { word.hasPrefix($0) } || temperatureWords.contains { word.hasPrefix($0) }
        }
        var highest: Double?
        for match in text.folded.matches(of: pattern) {
            let wholeText = String(match.output.1)
            let decimal = match.output.2.map(String.init)
            guard let whole = Double(wholeText) else { continue }
            let value = whole + (decimal.flatMap(Double.init) ?? 0) / 10

            let touching = text.folded[match.range.upperBound...]
            if touching.first == "w" { continue }  // "38w"
            let after = touching.drop { $0 == " " }
            if notTemperatureUnits.contains(where: { after.hasPrefix($0) }) { continue }
            let unit = after.prefix { $0.isLetter }
            let saysFahrenheit = unit == "f" || after.hasPrefix("°f") || after.hasPrefix("° f")
            let saysCelsius = unit == "c" || after.hasPrefix("°") || unit.hasPrefix("stop")
            guard decimal != nil || saysCelsius || saysFahrenheit || hasFeverWord else { continue }

            let celsius: Double
            switch value {
            case 35...43 where !saysFahrenheit: celsius = value
            case 95...110: celsius = (value - 32) * 5 / 9
            default: continue
            }
            highest = max(highest ?? celsius, celsius)
        }
        return highest
    }

    /// A word for fever, not negated ("no fever", "bez gorączki").
    static func mentionsFever(in text: GateText) -> Bool {
        for (index, word) in text.words.enumerated() where feverWords.contains(where: { word.hasPrefix($0) }) {
            if index > 0, ["no", "not", "without", "bez", "nie"].contains(text.words[index - 1]) { continue }
            return true
        }
        return false
    }

    private static let feverWords = ["fever", "goraczk", "podgoraczk"]
    /// Only give a bare number context. "Temperature" on its own isn't a fever.
    private static let temperatureWords = ["temp", "temperatur", "stopni"]
    private static let notTemperatureUnits = ["week", "wk", "tydz", "tyg", "day", "dni", "dzien", "hour", "godz", "min", "ml", "cm", "kg", "g ", "month", "mies", "%"]
    nonisolated(unsafe) private static let pattern = #/(?:^|[^\d.,])(\d{2,3})(?:[.,](\d))?(?!\d)/#
}
