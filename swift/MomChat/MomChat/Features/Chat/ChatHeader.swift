import Foundation

/// The chat title for the active child: "Week 24 · 2nd trimester" or "Emma · 7 months".
struct ChatHeader: Equatable {
    let title: String
    let subtitle: String?

    init(child: Child?, on date: Date = .now, calendar: Calendar = .current, locale: Locale = .current) {
        if let child, let progress = child.pregnancy(on: date, calendar: calendar) {
            title = String(localized: "Week \(progress.weeks)")
            subtitle = String(localized: Trimester(progress.trimester).title)
        } else if let child, let age = child.age(on: date, calendar: calendar) {
            let name = child.name ?? String(localized: "Baby")
            let ageText = age == .days(0) ? String(localized: "born today") : DurationText.age(age, locale: locale)
            title = String(localized: "\(name) · \(ageText)")
            subtitle = child.correctedAge(on: date, calendar: calendar).map { Self.corrected($0, locale: locale) }
        } else {
            // No profile yet, or an archived pregnancy.
            title = String(localized: "MomChat")
            subtitle = nil
        }
    }

    private static func corrected(_ age: CorrectedAge, locale: Locale) -> String {
        let duration = DurationText.corrected(age, locale: locale)
        switch age {
        case .age: return String(localized: "Corrected age \(duration)")
        case .beforeDueDate: return String(localized: "\(duration) before due date")
        }
    }
}

enum Trimester {
    case first, second, third

    /// 1, 2 or 3, as `PregnancyProgress.trimester` gives it.
    init(_ number: Int) {
        switch number {
        case ...1: self = .first
        case 2: self = .second
        default: self = .third
        }
    }

    var title: LocalizedStringResource {
        switch self {
        case .first: "1st trimester"
        case .second: "2nd trimester"
        case .third: "3rd trimester"
        }
    }
}
