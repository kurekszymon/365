import Foundation

/// The few lines about mom and child that go into every session's instructions (target ≤ 150 tokens).
/// Always English: the model answers in English (Stage 2 decision), whatever the app language.
///
///     Mom: 7 months postpartum, C-section, first baby.
///     Child: Emma, girl, 7 months (corrected 6 months, born 4 weeks early).
///     Feeding: breastfed.
///     Allergies: none known. Conditions: mild reflux.
///     Recent notes: rolling both ways (Oct 2); first tooth (Oct 10).
enum ProfileBlock {
    /// Notes beyond this are visible in the profile but not sent.
    static let noteLimit = 5
    /// Long free-text entries are cut so one note can't eat the budget.
    static let itemLength = 60
    static let listLimit = 4

    static let locale = Locale(identifier: "en_US")

    /// - Parameters:
    ///   - others: her other current children and pregnancies (not this one, not archived).
    ///   - twins: the babies born together with `child`, without `child` itself.
    static func make(mom: MomProfile?, child: Child, twins: [Child] = [], others: [Child] = [], on date: Date = .now, calendar: Calendar = .current) -> String {
        var lines: [String] = []
        if let momLine = momLine(mom: mom, child: child, on: date, calendar: calendar) { lines.append(momLine) }

        switch child.stage {
        case .expecting:
            lines += pregnancyLines(child, on: date, calendar: calendar)
        case .born:
            lines += bornLines(child, twins: twins, on: date, calendar: calendar)
        case .archived:
            lines.append("This pregnancy has ended in a loss. Don't mention weeks, due dates or the baby's development. Be gentle.")
        }

        if !others.isEmpty {
            lines.append("Her other children: " + others.map { describeOther($0, on: date, calendar: calendar) }.joined(separator: "; ") + ".")
        }
        let notes = recentNotes(mom: mom, child: child)
        if !notes.isEmpty {
            lines.append("Recent notes: " + notes.map { "\(clip($0.text)) (\(shortDate($0.createdAt, calendar: calendar)))" }.joined(separator: "; ") + ".")
        }
        return lines.joined(separator: "\n")
    }

    // MARK: Mom

    private static func momLine(mom: MomProfile?, child: Child, on date: Date, calendar: Calendar) -> String? {
        var parts: [String] = []

        if child.stage == .born, let age = child.age(on: date, calendar: calendar) {
            // After the first year her own recovery rarely matters, so the line gets shorter.
            if !isOverAYear(age) {
                parts.append(age == .days(0) ? "gave birth today" : "\(DurationText.age(age, locale: locale)) postpartum")
                if let delivery = child.deliveryType { parts.append(delivery == .cesarean ? "C-section" : "vaginal birth") }
            }
        }

        if let previous = mom?.previousBirths {
            switch (child.stage, previous) {
            case (.expecting, 0): parts.append("first pregnancy")
            case (.expecting, _): parts.append("has given birth before")
            case (.born, 0): parts.append("first baby")
            default: break
            }
        }

        var line = parts.isEmpty ? "" : parts.joined(separator: ", ") + "."
        if let mom {
            line += listPart(" Conditions", mom.conditions)
            line += listPart(" Medications", mom.medications)
        }
        line = line.trimmingCharacters(in: .whitespaces)
        return line.isEmpty ? nil : "Mom: " + line
    }

    // MARK: Pregnancy

    private static func pregnancyLines(_ child: Child, on date: Date, calendar: Calendar) -> [String] {
        var lines: [String] = []
        if let progress = child.pregnancy(on: date, calendar: calendar), let dueDate = child.dueDate {
            let week = DurationText.pregnancy(progress, locale: locale)
            lines.append("Pregnant: \(week) (\(ordinal(progress.trimester)) trimester), due \(shortDate(dueDate, calendar: calendar)), \(babies(child.multiples)).")
        } else {
            lines.append("Pregnant, \(babies(child.multiples)).")
        }

        var baby: [String] = []
        if let name = child.name { baby.append("named \(name)") }
        if let sex = child.sex { baby.append(child.multiples > 1 ? "\(sex.rawValue)s" : "a \(sex.rawValue)") }
        if !baby.isEmpty { lines.append("Baby: " + baby.joined(separator: ", ") + ".") }

        let watching = listPart("Pregnancy notes", child.pregnancyConditions).trimmingCharacters(in: .whitespaces)
        if !watching.isEmpty { lines.append(watching) }
        return lines
    }

    // MARK: Born

    private static func bornLines(_ child: Child, twins: [Child], on date: Date, calendar: Calendar) -> [String] {
        var lines: [String] = []
        var head = [child.name ?? "Baby"]
        if let sex = child.sex { head.append(sex.rawValue) }
        if let age = child.age(on: date, calendar: calendar) {
            var ageText = age == .days(0) ? "born today" : DurationText.age(age, locale: locale)
            if let corrected = child.correctedAge(on: date, calendar: calendar) {
                ageText += " (\(correctedText(corrected))\(child.weeksEarly(calendar: calendar).map { ", born \($0) \($0 == 1 ? "week" : "weeks") early" } ?? ""))"
            }
            head.append(ageText)
        }
        var childLine = "Child: " + head.joined(separator: ", ") + "."
        if !twins.isEmpty {
            let word = twins.count == 1 ? "Twin" : "Triplet"
            childLine += " \(word) of " + twins.map { $0.name ?? "a sibling" }.joined(separator: " and ") + "."
        }
        lines.append(childLine)

        if let feeding = child.feeding { lines.append("Feeding: \(feedingText(feeding)).") }

        let allergies = child.allergies.isEmpty ? "Allergies: none known." : listPart("Allergies", child.allergies).trimmingCharacters(in: .whitespaces)
        let health = (allergies + listPart(" Conditions", child.conditions) + listPart(" Medications", child.medications))
        lines.append(health)
        return lines
    }

    private static func correctedText(_ corrected: CorrectedAge) -> String {
        switch corrected {
        case .age(.days(0)): "due date today"
        case .age(let age): "corrected \(DurationText.age(age, locale: locale))"
        case .beforeDueDate(let days): "\(DurationText.corrected(.beforeDueDate(days: days), locale: locale)) before due date"
        }
    }

    // MARK: Others

    private static func describeOther(_ other: Child, on date: Date, calendar: Calendar) -> String {
        switch other.stage {
        case .expecting:
            if let progress = other.pregnancy(on: date, calendar: calendar) {
                return "a pregnancy at \(progress.weeks) weeks"
            }
            return "a pregnancy"
        case .born, .archived:
            let name = other.name ?? "a child"
            guard let age = other.age(on: date, calendar: calendar) else { return name }
            return "\(name) (\(age == .days(0) ? "born today" : DurationText.age(age, locale: locale)))"
        }
    }

    // MARK: Notes

    private static func recentNotes(mom: MomProfile?, child: Child) -> [ProfileNote] {
        // An ended pregnancy's notes would bring up what she's asked not to be reminded of.
        let all = (child.stage == .archived ? [] : child.notes) + (mom?.notes ?? [])
        let filled = all.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        return Array(filled.sorted { $0.createdAt > $1.createdAt }.prefix(noteLimit)).reversed()
    }

    // MARK: Text helpers

    /// " Conditions: a, b." or "" when empty.
    private static func listPart(_ label: String, _ items: [String]) -> String {
        let cleaned = items.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        guard !cleaned.isEmpty else { return "" }
        var shown = cleaned.prefix(listLimit).map(clip)
        if cleaned.count > listLimit { shown.append("and \(cleaned.count - listLimit) more") }
        return "\(label): \(shown.joined(separator: ", "))."
    }

    static func clip(_ text: String) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: CharacterSet(charactersIn: "."))
        guard trimmed.count > itemLength else { return trimmed }
        return String(trimmed.prefix(itemLength - 1)).trimmingCharacters(in: .whitespaces) + "…"
    }

    private static func shortDate(_ date: Date, calendar: Calendar) -> String {
        var style = Date.FormatStyle(date: .omitted, time: .omitted, locale: locale, calendar: calendar, timeZone: calendar.timeZone)
        style = style.month(.abbreviated).day()
        return date.formatted(style)
    }

    private static func babies(_ count: Int) -> String {
        switch count {
        case ...1: "singleton"
        case 2: "twins"
        case 3: "triplets"
        default: "\(count) babies"
        }
    }

    private static func ordinal(_ number: Int) -> String {
        switch number {
        case 1: "1st"
        case 2: "2nd"
        default: "3rd"
        }
    }

    private static func feedingText(_ feeding: Child.Feeding) -> String {
        switch feeding {
        case .breast: "breastfed"
        case .formula: "formula-fed"
        case .mixed: "breast milk + formula"
        case .solidsAndMilk: "solids + milk"
        }
    }

    private static func isOverAYear(_ age: ChildAge) -> Bool {
        switch age {
        case .days, .weeks: false
        case .months(let months): months >= 12
        case .years: true
        }
    }
}
