import Foundation

/// Hand-written instructions and profile blocks for the Stage 2 spike.
/// Stage 6 replaces this with `Core/Prompting`, built from real SwiftData profiles.
nonisolated enum SpikePrompt {
    enum Language: String, Codable, CaseIterable, Identifiable, Sendable {
        case en, pl

        var id: String { rawValue }
        var name: String { self == .en ? "English" : "Polish" }
        var locale: Locale { Locale(identifier: self == .en ? "en_US" : "pl_PL") }
    }

    struct Profile: Identifiable, Hashable, Sendable {
        let id: String
        let name: String
        let block: String
    }

    static let profiles: [Profile] = [
        Profile(id: "pregnant-8w", name: "Pregnant · 8 weeks", block: """
            Mom: first pregnancy. No known conditions.
            Pregnant: 8 weeks 2 days (1st trimester), due May 30, singleton.
            """),
        Profile(id: "pregnant-24w", name: "Pregnant · 24 weeks", block: """
            Mom: first pregnancy. Conditions: hypothyroidism (levothyroxine).
            Pregnant: 24 weeks 3 days (2nd trimester), due Jan 30, singleton.
            Pregnancy notes: gestational diabetes test scheduled (Oct 20).
            """),
        Profile(id: "pregnant-36w", name: "Pregnant · 36 weeks, 2nd child", block: """
            Mom: second pregnancy, first birth was a C-section. Toddler at home (2 years).
            Pregnant: 36 weeks 1 day (3rd trimester), due Nov 30, singleton.
            """),
        Profile(id: "newborn-3w", name: "Lena · 3 weeks", block: """
            Mom: 3 weeks postpartum, vaginal birth, first baby, breastfeeding.
            Child: Lena, girl, 3 weeks 2 days, born at 39 weeks.
            Feeding: exclusively breastfed.
            Allergies: none known. Conditions: none.
            """),
        Profile(id: "baby-7m", name: "Emma · 7 months, preemie", block: """
            Mom: 7 months postpartum, C-section, breastfeeding.
            Child: Emma, girl, 7 months (corrected 6 months, born 4 weeks early).
            Feeding: breastfed + started solids.
            Allergies: none known. Conditions: mild reflux.
            Recent notes: rolling both ways (Oct 2); first tooth (Oct 10).
            """),
        Profile(id: "toddler-2y", name: "Leo · 2 years", block: """
            Mom: second child.
            Child: Leo, boy, 2 years 2 months.
            Feeding: family meals + cow's milk.
            Allergies: none known. Conditions: none.
            """),
    ]

    static func profile(id: String) -> Profile? {
        profiles.first { $0.id == id }
    }

    static func instructions(profile: Profile, language: Language) -> String {
        """
        You are MomChat, a warm and calm assistant for pregnant women and new moms. \
        You give clear, practical information about pregnancy, recovery after birth and caring for children up to age 3.

        Rules:
        - You are not a doctor. Don't diagnose and never give medication doses.
        - In pregnancy, never say a medication is "safe to take". Say what is generally known and tell her to confirm with her doctor or pharmacist.
        - If something could be serious, say clearly and early that she should contact her doctor, midwife or emergency services.
        - Keep answers short: 3 to 6 sentences or a few bullet points. She may be tired and reading one-handed at night.
        - Use the profile below. Mention the child's name, age or the pregnancy week when it matters to the answer.
        - Be kind and reassuring without being preachy.
        - \(language == .pl ? "Always answer in Polish, even if the profile is in English." : "Always answer in English.")

        Profile:
        \(profile.block)
        """
    }
}
