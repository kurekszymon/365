import Foundation

/// Sample profiles for the playground and the question runner. They are real (unsaved) `MomProfile`
/// and `Child` objects, dated relative to today, so the evals run the same prompt builder as the chat.
enum EvalProfiles {
    nonisolated enum Language: String, Codable, CaseIterable, Identifiable, Sendable {
        case en, pl

        var id: String { rawValue }
        var name: String { self == .en ? "English" : "Polish" }
    }

    struct Profile: Identifiable {
        let id: String
        let name: String
        let mom: MomProfile
        let child: Child
        var others: [Child] = []

        func block(on date: Date = .now) -> String {
            ProfileBlock.make(mom: mom, child: child, others: others, on: date)
        }
    }

    static func profiles(on date: Date = .now, calendar: Calendar = .current) -> [Profile] {
        func day(_ offset: Int) -> Date {
            calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: date))!
        }
        /// Due date that puts the pregnancy at `weeks`w`days`d today.
        func due(_ weeks: Int, _ days: Int = 0) -> Date {
            day(PregnancyDates.termDays - weeks * 7 - days)
        }
        func monthsAgo(_ months: Int, days: Int = 0) -> Date {
            calendar.date(byAdding: .day, value: -days, to: calendar.date(byAdding: .month, value: -months, to: calendar.startOfDay(for: date))!)!
        }

        let firstTime = { MomProfile(previousBirths: 0) }

        let thyroid = MomProfile(previousBirths: 0)
        thyroid.conditions = ["hypothyroidism"]
        thyroid.medications = ["levothyroxine"]
        let pregnant24 = Child(stage: .expecting, dueDate: due(24, 3))
        pregnant24.pregnancyConditions = ["glucose test scheduled"]

        let toddler = Child(name: "Leo", stage: .born, birthDate: monthsAgo(24, days: 3))
        toddler.sex = .boy

        let lena = Child(name: "Lena", stage: .born, dueDate: day(-16), birthDate: day(-23))
        lena.sex = .girl
        lena.deliveryType = .vaginal
        lena.feeding = .breast

        let emma = Child(name: "Emma", stage: .born, birthDate: monthsAgo(7))
        emma.dueDate = calendar.date(byAdding: .day, value: 28, to: emma.birthDate!)
        emma.sex = .girl
        emma.deliveryType = .cesarean
        emma.feeding = .breast
        emma.conditions = ["mild reflux"]

        let leo = Child(name: "Leo", stage: .born, birthDate: monthsAgo(26))
        leo.sex = .boy
        leo.feeding = .solidsAndMilk

        return [
            Profile(id: "pregnant-8w", name: "Pregnant · 8 weeks", mom: firstTime(), child: Child(stage: .expecting, dueDate: due(8, 2))),
            Profile(id: "pregnant-24w", name: "Pregnant · 24 weeks", mom: thyroid, child: pregnant24),
            Profile(id: "pregnant-36w", name: "Pregnant · 36 weeks, 2nd child", mom: MomProfile(previousBirths: 1),
                    child: Child(stage: .expecting, dueDate: due(36, 1)), others: [toddler]),
            Profile(id: "newborn-3w", name: "Lena · 3 weeks", mom: firstTime(), child: lena),
            Profile(id: "baby-7m", name: "Emma · 7 months, preemie", mom: MomProfile(), child: emma),
            Profile(id: "toddler-2y", name: "Leo · 2 years", mom: MomProfile(previousBirths: 1), child: leo),
        ]
    }

    static func profile(id: String) -> Profile? {
        profiles().first { $0.id == id }
    }

    nonisolated static let ids: Set<String> = ["pregnant-8w", "pregnant-24w", "pregnant-36w", "newborn-3w", "baby-7m", "toddler-2y"]

    /// The same instructions the chat sends. The model always answers in English (Stage 2 decision).
    static func instructions(profile: Profile, on date: Date = .now) -> String {
        Instructions.make(profileBlock: profile.block(on: date), on: date)
    }
}
