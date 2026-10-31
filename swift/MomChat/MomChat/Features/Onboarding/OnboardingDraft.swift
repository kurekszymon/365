import Foundation
import SwiftData

/// Everything onboarding collects, held in memory until the last step. The rules live here,
/// not in the views, so they can be tested.
struct OnboardingDraft {
    enum Path: Hashable {
        case expecting, born, both

        var includesPregnancy: Bool { self != .born }
        var includesBirth: Bool { self != .expecting }
    }

    enum DueDateSource: Hashable {
        case dueDate, lastPeriod
    }

    struct Pregnancy {
        var source = DueDateSource.dueDate
        var dueDate: Date
        var lastPeriod: Date
        var babies = 1
        /// `nil` = skipped. Not asked on the "Both" path.
        var isFirstPregnancy: Bool?
        var name = ""
        var sex: Child.Sex?
        var doctorNotes = ""
    }

    struct Baby: Identifiable {
        let id = UUID()
        var name = ""
        var sex: Child.Sex?
        var allergies = ""
        var conditions = ""
    }

    /// Shared by every baby from the same birth.
    struct Birth {
        var birthDate: Date
        var babies = [Baby()]
        var bornEarly = false
        var weeksEarly = 4
        var deliveryType: Child.Delivery?
        var feeding: Child.Feeding?
    }

    /// Up to 17 weeks early (born at 23 weeks). Corrected age only kicks in from 4 weeks early (before 37w0d).
    static let weeksEarlyRange = 1...17

    var path: Path?
    /// Adding a child or pregnancy from the profiles screen, after onboarding.
    var isAddingToProfile = false
    var pregnancy: Pregnancy
    var birth: Birth

    let today: Date
    let calendar: Calendar

    init(today: Date = .now, calendar: Calendar = .current) {
        self.today = today
        self.calendar = calendar
        let start = calendar.startOfDay(for: today)
        pregnancy = Pregnancy(
            dueDate: calendar.date(byAdding: .day, value: 140, to: start)!,
            lastPeriod: calendar.date(byAdding: .day, value: -56, to: start)!
        )
        birth = Birth(birthDate: start)
    }

    // MARK: Validation

    /// From about 2 weeks overdue to a pregnancy that has just started.
    var dueDateRange: ClosedRange<Date> {
        day(-14)...day(PregnancyDates.termDays)
    }

    /// The last-period dates whose due date falls inside `dueDateRange`.
    var lastPeriodRange: ClosedRange<Date> {
        day(-14 - PregnancyDates.termDays)...day(0)
    }

    /// Not in the future, and the app covers up to age 3.
    var birthDateRange: ClosedRange<Date> {
        calendar.date(byAdding: .year, value: -3, to: day(0))!...today
    }

    var resolvedDueDate: Date {
        switch pregnancy.source {
        case .dueDate: calendar.startOfDay(for: pregnancy.dueDate)
        case .lastPeriod: PregnancyDates.dueDate(lastPeriod: pregnancy.lastPeriod, calendar: calendar)
        }
    }

    var isPregnancyValid: Bool {
        dueDateRange.contains(resolvedDueDate) && pregnancy.babies >= 1
    }

    var isBirthValid: Bool {
        birthDateRange.contains(birth.birthDate) && !birth.babies.isEmpty
    }

    /// Only asked of a mom who's only expecting, during onboarding.
    var asksFirstPregnancy: Bool {
        path == .expecting && !isAddingToProfile
    }

    var isComplete: Bool {
        guard let path else { return false }
        return (!path.includesPregnancy || isPregnancyValid) && (!path.includesBirth || isBirthValid)
    }

    /// Adds or removes baby blocks, keeping what was already typed. No upper limit.
    mutating func setBabyCount(_ count: Int) {
        let count = max(count, 1)
        if count < birth.babies.count {
            birth.babies.removeLast(birth.babies.count - count)
        } else {
            birth.babies += (birth.babies.count..<count).map { _ in Baby() }
        }
    }

    // MARK: Saving

    /// Inserts the mom and her children. On the "Both" path the pregnancy is the one the chat opens on.
    @discardableResult
    func save(in context: ModelContext) -> MomProfile {
        precondition(isComplete, "save only a complete draft")
        let path = path!

        let mom = MomProfile(previousBirths: previousBirths(for: path))
        context.insert(mom)
        mom.activeChild = makeChildren(for: path, in: context)
        return mom
    }

    /// Adds a pregnancy or a baby to an existing profile. The chat moves to it.
    @discardableResult
    func addChildren(to mom: MomProfile, in context: ModelContext) -> Child? {
        precondition(isComplete, "add only a complete draft")
        let child = makeChildren(for: path!, in: context)
        mom.activeChild = child
        return child
    }

    /// The child the chat opens on: the pregnancy if there is one, else the first baby.
    private func makeChildren(for path: Path, in context: ModelContext) -> Child? {
        var active: Child?
        if path.includesBirth {
            active = makeBorn(in: context).first
        }
        if path.includesPregnancy {
            active = makePregnancy(in: context)
        }
        return active
    }

    /// 0 = first-time mom. "No" only tells us there were earlier births, so it's stored as 1.
    private func previousBirths(for path: Path) -> Int? {
        switch path {
        case .expecting: pregnancy.isFirstPregnancy.map { $0 ? 0 : 1 }
        case .both: 1
        case .born: nil
        }
    }

    private func makePregnancy(in context: ModelContext) -> Child {
        let child = Child(name: Self.optional(pregnancy.name), stage: .expecting, dueDate: resolvedDueDate, multiples: pregnancy.babies)
        child.sex = pregnancy.sex
        child.pregnancyConditions = Self.list(pregnancy.doctorNotes)
        context.insert(child)
        return child
    }

    private func makeBorn(in context: ModelContext) -> [Child] {
        let dueDate = birth.bornEarly
            ? calendar.date(byAdding: .day, value: birth.weeksEarly * 7, to: calendar.startOfDay(for: birth.birthDate))
            : nil
        let groupID = birth.babies.count > 1 ? UUID() : nil

        return birth.babies.map { baby in
            let child = Child(name: Self.optional(baby.name), stage: .born, dueDate: dueDate, birthDate: birth.birthDate, multiples: birth.babies.count)
            child.multipleBirthID = groupID
            child.sex = baby.sex
            child.deliveryType = birth.deliveryType
            child.feeding = birth.feeding
            child.allergies = Self.list(baby.allergies)
            child.conditions = Self.list(baby.conditions)
            context.insert(child)
            return child
        }
    }

    // MARK: Helpers

    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: today))!
    }

    static func optional(_ text: String) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    /// "egg, peanuts" → ["egg", "peanuts"]. Commas, semicolons or new lines separate items.
    static func list(_ text: String) -> [String] {
        text.split(whereSeparator: { ",;\n".contains($0) })
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
}
