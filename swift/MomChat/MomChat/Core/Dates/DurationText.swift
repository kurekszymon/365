import Foundation

/// "24 weeks 3 days", "7 months", "2 lata 2 miesiące". Plural forms come from Foundation (CLDR),
/// which already handles Polish: 1 tydzień, 2 tygodnie, 5 tygodni, 22 tygodnie.
nonisolated enum DurationText {
    static func pregnancy(_ progress: PregnancyProgress, locale: Locale = .current) -> String {
        join([(progress.weeks, .weekOfMonth), (progress.days, .day)], locale: locale, keepZeroFirst: true)
    }

    static func age(_ age: ChildAge, locale: Locale = .current) -> String {
        switch age {
        case .days(let days):
            unit(days, .day, locale: locale)
        case .weeks(let weeks, let days):
            join([(weeks, .weekOfMonth), (days, .day)], locale: locale)
        case .months(let months):
            unit(months, .month, locale: locale)
        case .years(let years, let months):
            join([(years, .year), (months, .month)], locale: locale)
        }
    }

    /// Only the duration part, e.g. "6 months" or "3 weeks". Callers add "corrected" / "before due date".
    static func corrected(_ age: CorrectedAge, locale: Locale = .current) -> String {
        switch age {
        case .age(let age):
            self.age(age, locale: locale)
        case .beforeDueDate(let days):
            join([(days / 7, .weekOfMonth), (days % 7, .day)], locale: locale)
        }
    }

    /// Drops zero parts ("6 weeks", not "6 weeks 0 days"). `keepZeroFirst` keeps "0 weeks 5 days" for pregnancy.
    private static func join(_ parts: [(Int, NSCalendar.Unit)], locale: Locale, keepZeroFirst: Bool = false) -> String {
        let kept = parts.enumerated().filter { index, part in part.0 > 0 || (index == 0 && keepZeroFirst) }
        guard !kept.isEmpty else { return unit(0, parts.last!.1, locale: locale) }
        return kept.map { unit($0.element.0, $0.element.1, locale: locale) }.joined(separator: " ")
    }

    private static func unit(_ value: Int, _ unit: NSCalendar.Unit, locale: Locale) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = locale
        let formatter = DateComponentsFormatter()
        formatter.calendar = calendar
        formatter.unitsStyle = .full
        formatter.allowedUnits = [unit]
        formatter.zeroFormattingBehavior = .pad

        var components = DateComponents()
        switch unit {
        case .day: components.day = value
        case .weekOfMonth: components.weekOfMonth = value
        case .month: components.month = value
        default: components.year = value
        }
        return formatter.string(from: components) ?? "\(value)"
    }
}
