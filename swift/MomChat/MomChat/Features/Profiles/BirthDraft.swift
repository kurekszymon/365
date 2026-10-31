import Foundation
import SwiftData

/// The "Has your baby arrived?" form, held in memory until Save. One block per expected baby.
struct BirthDraft {
    struct Baby: Identifiable {
        let id = UUID()
        var name = ""
        var sex: Child.Sex?
        var feeding: Child.Feeding?
    }

    /// Earliest birth the form accepts: 22w0d. A loss before that goes through "End this pregnancy".
    static let earliestBirthDays = 154

    var birthDate: Date
    var deliveryType: Child.Delivery?
    var babies: [Baby]

    let dueDate: Date?
    let today: Date
    let calendar: Calendar

    /// One block per baby in `multiples`. A single baby keeps the name and sex picked during pregnancy.
    init(pregnancy: Child, today: Date = .now, calendar: Calendar = .current) {
        self.today = today
        self.calendar = calendar
        dueDate = pregnancy.dueDate
        birthDate = calendar.startOfDay(for: today)
        babies = (0..<max(pregnancy.multiples, 1)).map { _ in Baby() }
        if pregnancy.multiples <= 1 {
            babies[0].name = pregnancy.name ?? ""
            babies[0].sex = pregnancy.sex
        }
    }

    /// From 22w0d (or 3 years ago without a due date) up to today.
    var birthDateRange: ClosedRange<Date> {
        let start = calendar.startOfDay(for: today)
        let earliest = dueDate.flatMap {
            calendar.date(byAdding: .day, value: Self.earliestBirthDays - PregnancyDates.termDays, to: calendar.startOfDay(for: $0))
        } ?? calendar.date(byAdding: .year, value: -3, to: start)!
        return min(earliest, start)...today
    }

    var isValid: Bool {
        birthDateRange.contains(birthDate) && !babies.isEmpty
    }

    /// Switches the pregnancy to born. Twins and more become one child each (`Child.recordBirth`),
    /// and the first baby keeps the pregnancy's record, so the chat stays on it.
    @discardableResult
    func record(into pregnancy: Child, in context: ModelContext) -> [Child] {
        precondition(isValid, "record only a valid draft")
        let newborns = babies.map {
            Newborn(name: OnboardingDraft.optional($0.name), sex: $0.sex, feeding: $0.feeding)
        }
        return pregnancy.recordBirth(at: calendar.startOfDay(for: birthDate), deliveryType: deliveryType, babies: newborns, in: context)
    }
}
