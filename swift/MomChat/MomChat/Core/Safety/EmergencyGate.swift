import Foundation

/// Which card a red flag opens. The raw value is saved on the question (`Message.emergencyTopic`).
nonisolated enum EmergencyTopic: String, CaseIterable, Sendable, Identifiable {
    // Baby
    case babyNotBreathing, babyChoking, babyUnresponsive, babySeizure, babyFever, babyHeadInjury, babyPoisoning, babyDehydration
    // Pregnancy
    case pregnancyBleeding, pregnancyAbdominalPain, pregnancyFainting
    case pregnancyWatersOrContractions, pregnancyReducedMovement, pregnancyPreeclampsia, pregnancyFever
    // After birth
    case postpartumBleeding, postpartumChestOrBreathing, postpartumInfection
    // Any stage
    case crisis

    enum Level: Sendable {
        /// Call the emergency number.
        case emergency
        /// Call the midwife or maternity ward now, the emergency number if nobody answers.
        case midwife
        /// A crisis line first, said gently.
        case crisis
    }

    var id: String { rawValue }

    var level: Level {
        switch self {
        case .crisis:
            .crisis
        case .pregnancyWatersOrContractions, .pregnancyReducedMovement, .pregnancyPreeclampsia, .pregnancyFever, .postpartumInfection:
            .midwife
        default:
            .emergency
        }
    }
}

/// Topics that still go to the model, but get local support details under the answer.
nonisolated enum SupportTopic: String, Sendable {
    case mentalHealth, loss
}

/// What the gate needs to know about who the question is about.
nonisolated enum GateContext: Sendable {
    /// `weeks` is `nil` when the due date is too far off to count.
    case expecting(weeks: Int?)
    case baby(ageDays: Int)
    /// No usable dates: only the phrases that are red flags for anyone.
    case unknown

    static let feverAlarmDays = 91
    static let postpartumDays = 365
}

/// Runs before the model. A match opens a full-screen card and the model isn't called, unless
/// she says from the card that it isn't happening now.
///
/// It's tuned to over-trigger: a false alarm costs one tap, a miss could cost far more.
/// The phrase lists are in `GateRules`. They must be reviewed by a midwife or pediatrician.
nonisolated enum EmergencyGate {
    static func emergency(in message: String, context: GateContext) -> EmergencyTopic? {
        let text = GateText(message)
        return GateRules.ordered.first { rule in
            rule.applies(in: context, to: text) && rule.matches(text)
        }?.topic ?? fever(in: text, context: context)
    }

    static func support(in message: String) -> SupportTopic? {
        let text = GateText(message)
        if text.contains(any: GateRules.lossSupport) { return .loss }
        if text.contains(any: GateRules.mentalHealthSupport) { return .mentalHealth }
        return nil
    }

    private static func fever(in text: GateText, context: GateContext) -> EmergencyTopic? {
        let reading = GateTemperature.celsius(in: text)
        let hasFever = (reading ?? 0) >= 38 || (reading == nil && GateTemperature.mentionsFever(in: text))
        guard hasFever else { return nil }
        switch context {
        case .expecting: return .pregnancyFever
        case .baby(let days) where days < GateContext.feverAlarmDays: return .babyFever
        default: return nil
        }
    }
}

/// One red flag: every group must match, with at least one phrase from each.
nonisolated struct GateRule: Sendable {
    enum Scope: Sendable {
        /// A child in trouble. While she's pregnant the message must also mention a child, so
        /// "I feel like I'm choking on this heartburn" doesn't fire.
        case child
        case anyone
        case pregnancy(fromWeek: Int? = nil, beforeWeek: Int? = nil)
        case postpartum
    }

    let topic: EmergencyTopic
    let scope: Scope
    let groups: [[GatePattern]]
    /// If any of these appear the rule doesn't fire ("bleeding gums").
    var excluding: [GatePattern] = []

    func matches(_ text: GateText) -> Bool {
        !text.contains(any: excluding) && groups.allSatisfy(text.contains(any:))
    }

    func applies(in context: GateContext, to text: GateText) -> Bool {
        switch (scope, context) {
        case (.anyone, _):
            return true
        case (.child, .expecting):
            return text.contains(any: GateRules.childWords)
        case (.child, _):
            return true
        case (.pregnancy(let from, let before), .expecting(let weeks)):
            // Unknown week: assume the rule applies.
            guard let weeks else { return true }
            return weeks >= (from ?? 0) && weeks < (before ?? .max)
        case (.postpartum, .baby(let days)):
            return days < GateContext.postpartumDays
        default:
            return false
        }
    }
}
