import Foundation

/// A child's age in the units a parent would use: days, then weeks, then months, then years.
nonisolated enum ChildAge: Equatable, Sendable {
    case days(Int)                   // under 2 weeks
    case weeks(Int, days: Int)       // under 3 months
    case months(Int)                 // under 2 years
    case years(Int, months: Int)

    /// `nil` if `birthDate` is after `date`.
    static func between(_ birthDate: Date, and date: Date, calendar: Calendar = .current) -> ChildAge? {
        let totalDays = calendar.daysBetween(birthDate, date)
        guard totalDays >= 0 else { return nil }
        let parts = calendar.dateComponents([.year, .month], from: calendar.startOfDay(for: birthDate), to: calendar.startOfDay(for: date))
        let totalMonths = parts.year! * 12 + parts.month!

        if totalDays < 14 { return .days(totalDays) }
        if totalMonths < 3 { return .weeks(totalDays / 7, days: totalDays % 7) }
        if totalMonths < 24 { return .months(totalMonths) }
        return .years(parts.year!, months: parts.month!)
    }
}

/// Age counted from the due date instead of the birth date, used for babies born preterm.
nonisolated enum CorrectedAge: Equatable, Sendable {
    case age(ChildAge)
    /// Still before the due date: the baby is younger than a newborn born at term.
    case beforeDueDate(days: Int)

    /// `nil` when no correction applies: born at 37 weeks or later, or 2 years old or more.
    static func between(birthDate: Date, dueDate: Date, and date: Date, calendar: Calendar = .current) -> CorrectedAge? {
        guard calendar.daysBetween(birthDate, dueDate) > PregnancyDates.termDays - PregnancyDates.pretermDays,
              let age = ChildAge.between(birthDate, and: date, calendar: calendar) else { return nil }
        if case .years = age { return nil }

        let daysToDue = calendar.daysBetween(date, dueDate)
        if daysToDue > 0 { return .beforeDueDate(days: daysToDue) }
        return ChildAge.between(dueDate, and: date, calendar: calendar).map(CorrectedAge.age)
    }
}
