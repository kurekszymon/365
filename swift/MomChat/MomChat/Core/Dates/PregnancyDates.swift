import Foundation

/// How far along a pregnancy is, counted from the first day of the last period (gestational age).
nonisolated struct PregnancyProgress: Equatable, Sendable {
    let totalDays: Int

    var weeks: Int { totalDays / 7 }
    var days: Int { totalDays % 7 }

    /// 1st trimester up to 13w6d, 2nd 14w0d–27w6d, 3rd from 28w0d.
    var trimester: Int {
        switch weeks {
        case ..<14: 1
        case ..<28: 2
        default: 3
        }
    }
}

nonisolated enum PregnancyDates {
    /// 40 weeks from the first day of the last period.
    static let termDays = 280
    /// Born before 37w0d.
    static let pretermDays = 259

    static func dueDate(lastPeriod: Date, calendar: Calendar = .current) -> Date {
        calendar.date(byAdding: .day, value: termDays, to: calendar.startOfDay(for: lastPeriod))!
    }

    /// `nil` before the pregnancy started (due date more than 40 weeks away).
    static func progress(dueDate: Date, on date: Date, calendar: Calendar = .current) -> PregnancyProgress? {
        let daysToDue = calendar.daysBetween(date, dueDate)
        let totalDays = termDays - daysToDue
        return totalDays >= 0 ? PregnancyProgress(totalDays: totalDays) : nil
    }
}

nonisolated extension Calendar {
    /// Whole calendar days from `start` to `end`, safe across DST changes.
    func daysBetween(_ start: Date, _ end: Date) -> Int {
        dateComponents([.day], from: startOfDay(for: start), to: startOfDay(for: end)).day!
    }
}
