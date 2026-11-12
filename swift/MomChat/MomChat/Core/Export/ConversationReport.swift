import Foundation

/// What goes into a conversation's PDF, already in the app's language. Built from SwiftData on the
/// main actor, then handed to `ConversationPDF` to draw.
///
/// It's meant to be handed to a doctor or midwife, so the profile is plain facts (dates, not only
/// "7 months"), and the age or pregnancy week is the one *at the time of the chat*.
nonisolated struct ConversationReport: Sendable, Equatable {
    struct Row: Sendable, Equatable {
        let label: String
        let value: String
    }

    struct Section: Sendable, Equatable {
        let title: String
        let rows: [Row]
    }

    struct Entry: Sendable, Equatable {
        enum Kind: Sendable, Equatable {
            case question, answer
            /// Where an answer would be: the emergency screen opened, or none came.
            case notice
            /// A new day starts.
            case day
        }

        let kind: Kind
        /// "03:14", or the date for `.day`.
        let time: String
        let text: String
        /// Under an answer the model marked as medical.
        var footnote: String? = nil
    }

    let title: String
    /// "Chat from 12 November 2026, 03:14"
    let period: String
    let sections: [Section]
    let entries: [Entry]
    /// Printed at the bottom of every page.
    let footer: String
    let fileName: String
}

@MainActor extension ConversationReport {
    static let noteLimit = ProfileBlock.noteLimit

    init(conversation: Conversation, mom: MomProfile?, now: Date = .now, calendar: Calendar = .current, locale: Locale = .current) {
        let messages = conversation.sortedMessages
        let start = messages.first?.createdAt ?? conversation.createdAt

        title = conversation.title.flatMap { $0.isEmpty ? nil : $0 } ?? String(localized: .exportPdfUntitled)
        period = String(localized: .exportPdfPeriod(Self.dateTime(start, calendar: calendar, locale: locale)))

        var sections: [Section] = []
        if let child = conversation.child {
            sections.append(Self.childSection(child, chatDate: start, calendar: calendar, locale: locale))
            let notes = Self.recentNotes(child.stage == .archived ? [] : child.notes)
            if !notes.isEmpty {
                sections.append(Section(title: String(localized: .exportPdfSectionNotes), rows: Self.noteRows(notes, calendar: calendar, locale: locale)))
            }
        }
        if let mom, let section = Self.momSection(mom, calendar: calendar, locale: locale) {
            sections.append(section)
        }
        self.sections = sections

        entries = Self.makeEntries(messages, calendar: calendar, locale: locale)
        footer = String(localized: .exportPdfFooter(Self.date(now, calendar: calendar, locale: locale)))
        fileName = Self.fileName(conversation.child, on: start, calendar: calendar)
    }

    // MARK: Child or pregnancy

    /// Born babies are described from the birth date, pregnancies from the due date. A chat from
    /// before the birth (kept on a baby's record) shows the pregnancy week it was asked in.
    private static func childSection(_ child: Child, chatDate: Date, calendar: Calendar, locale: Locale) -> Section {
        var rows: [Row] = []
        let isBornAtChat = child.birthDate.map { calendar.daysBetween($0, chatDate) >= 0 } ?? false

        if let name = child.name { rows.append(Row(label: String(localized: .exportPdfName), value: name)) }
        if let sex = child.sex { rows.append(Row(label: String(localized: .exportPdfSex), value: String(localized: sexText(sex)))) }

        if child.stage == .born, let birthDate = child.birthDate {
            rows.append(Row(label: String(localized: .exportPdfBirthDate), value: date(birthDate, calendar: calendar, locale: locale)))
            if isBornAtChat, let age = ChildAge.between(birthDate, and: chatDate, calendar: calendar) {
                var value = age == .days(0) ? String(localized: .chatHeaderBornToday) : DurationText.age(age, locale: locale)
                if let dueDate = child.dueDate, let corrected = CorrectedAge.between(birthDate: birthDate, dueDate: dueDate, and: chatDate, calendar: calendar) {
                    value += " (" + correctedText(corrected, locale: locale) + ")"
                }
                rows.append(Row(label: String(localized: .exportPdfAgeAtChat), value: value))
            }
            if let weeks = child.weeksEarly(calendar: calendar) {
                rows.append(Row(label: String(localized: .exportPdfBornEarly), value: String(localized: .exportPdfWeeksEarly(weeks))))
            }
        }

        if !isBornAtChat, let dueDate = child.dueDate {
            rows.append(Row(label: String(localized: .exportPdfDueDate), value: date(dueDate, calendar: calendar, locale: locale)))
            if let progress = PregnancyDates.progress(dueDate: dueDate, on: chatDate, calendar: calendar) {
                let value = DurationText.pregnancy(progress, locale: locale) + " · " + String(localized: Trimester(progress.trimester).title)
                rows.append(Row(label: String(localized: .exportPdfWeekAtChat), value: value))
            }
            if child.multiples > 1 {
                rows.append(Row(label: String(localized: .exportPdfBabies), value: child.multiples.formatted(.number.locale(locale))))
            }
            if child.stage == .archived {
                rows.append(Row(label: String(localized: .exportPdfStatus), value: String(localized: .exportPdfPregnancyEnded)))
            }
            add(&rows, .exportPdfPregnancyConditions, child.pregnancyConditions)
        }

        if child.stage == .born {
            if let delivery = child.deliveryType {
                rows.append(Row(label: String(localized: .profileChildDelivery), value: String(localized: delivery == .cesarean ? .profileChildDeliveryCesarean : .profileChildDeliveryVaginal)))
            }
            if let feeding = child.feeding {
                rows.append(Row(label: String(localized: .profileChildFeeding), value: String(localized: feedingText(feeding))))
            }
            add(&rows, .profileChildAllergies, child.allergies)
            add(&rows, .profileChildConditions, child.conditions)
            add(&rows, .profileChildMedications, child.medications)
        }

        let title: LocalizedStringResource = child.stage == .born ? .exportPdfSectionChild : .exportPdfSectionPregnancy
        return Section(title: String(localized: title), rows: rows)
    }

    private static func correctedText(_ corrected: CorrectedAge, locale: Locale) -> String {
        switch corrected {
        case .age(.days(0)): String(localized: .chatHeaderDueDateToday)
        case .age: String(localized: .exportPdfCorrectedAge(DurationText.corrected(corrected, locale: locale)))
        case .beforeDueDate: String(localized: .chatHeaderBeforeDueDate(DurationText.corrected(corrected, locale: locale)))
        }
    }

    // MARK: Mom

    private static func momSection(_ mom: MomProfile, calendar: Calendar, locale: Locale) -> Section? {
        var rows: [Row] = []
        if let name = mom.name?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty {
            rows.append(Row(label: String(localized: .exportPdfName), value: name))
        }
        if let previous = mom.previousBirths {
            rows.append(Row(label: String(localized: .exportPdfEarlierBirths), value: previous.formatted(.number.locale(locale))))
        }
        add(&rows, .exportPdfMomConditions, mom.conditions)
        add(&rows, .exportPdfMomMedications, mom.medications)
        let notes = recentNotes(mom.notes)
        rows += noteRows(notes, calendar: calendar, locale: locale)
        return rows.isEmpty ? nil : Section(title: String(localized: .exportPdfSectionMom), rows: rows)
    }

    // MARK: Notes

    private static func recentNotes(_ all: [ProfileNote]) -> [ProfileNote] {
        let filled = all.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        return Array(filled.sorted { $0.createdAt > $1.createdAt }.prefix(noteLimit))
    }

    /// The date as the label, the note as the value.
    private static func noteRows(_ notes: [ProfileNote], calendar: Calendar, locale: Locale) -> [Row] {
        notes.map { Row(label: date($0.createdAt, calendar: calendar, locale: locale), value: $0.text.trimmingCharacters(in: .whitespacesAndNewlines)) }
    }

    // MARK: Messages

    private static func makeEntries(_ messages: [Message], calendar: Calendar, locale: Locale) -> [Entry] {
        var entries: [Entry] = []
        var lastDay: Date?
        for (index, message) in messages.enumerated() {
            let day = calendar.startOfDay(for: message.createdAt)
            // The first day is already in the heading.
            if let lastDay, day != lastDay {
                entries.append(Entry(kind: .day, time: date(message.createdAt, calendar: calendar, locale: locale), text: ""))
            }
            lastDay = day

            let time = Self.time(message.createdAt, calendar: calendar, locale: locale)
            switch message.role {
            case .user:
                entries.append(Entry(kind: .question, time: time, text: message.text))
                let answered = messages.dropFirst(index + 1).first?.role == .assistant
                if message.emergency != nil {
                    entries.append(Entry(kind: .notice, time: "", text: String(localized: .exportPdfEmergencyNotice)))
                } else if !answered {
                    entries.append(Entry(kind: .notice, time: "", text: String(localized: .exportPdfNoAnswer)))
                }
            case .assistant:
                entries.append(Entry(
                    kind: .answer,
                    time: time,
                    text: message.text,
                    footnote: message.showsDisclaimer ? String(localized: .chatMedicalFootnote) : nil
                ))
            }
        }
        return entries
    }

    // MARK: Helpers

    private static func add(_ rows: inout [Row], _ label: LocalizedStringResource, _ items: [String]) {
        let cleaned = items.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        guard !cleaned.isEmpty else { return }
        // Commas, not "a and b": two conditions would read like one.
        rows.append(Row(label: String(localized: label), value: cleaned.joined(separator: ", ")))
    }

    private static func sexText(_ sex: Child.Sex) -> LocalizedStringResource {
        switch sex {
        case .girl: .profileChildSexGirl
        case .boy: .profileChildSexBoy
        }
    }

    private static func feedingText(_ feeding: Child.Feeding) -> LocalizedStringResource {
        switch feeding {
        case .breast: .profileChildFeedingBreast
        case .formula: .profileChildFeedingFormula
        case .mixed: .profileChildFeedingMixed
        case .solidsAndMilk: .profileChildFeedingSolidsAndMilk
        }
    }

    private static func style(_ calendar: Calendar, _ locale: Locale) -> Date.FormatStyle {
        Date.FormatStyle(date: .omitted, time: .omitted, locale: locale, calendar: calendar, timeZone: calendar.timeZone)
    }

    /// "12 November 2026"
    static func date(_ date: Date, calendar: Calendar, locale: Locale) -> String {
        date.formatted(style(calendar, locale).day().month(.wide).year())
    }

    /// "03:14" or "3:14 AM", as her phone shows times.
    static func time(_ date: Date, calendar: Calendar, locale: Locale) -> String {
        date.formatted(style(calendar, locale).hour().minute())
    }

    private static func dateTime(_ date: Date, calendar: Calendar, locale: Locale) -> String {
        date.formatted(style(calendar, locale).day().month(.wide).year().hour().minute())
    }

    /// "MomChat Emma 2026-11-12". The date sorts well in Files whatever the language.
    private static func fileName(_ child: Child?, on date: Date, calendar: Calendar) -> String {
        let day = date.formatted(Date.ISO8601FormatStyle(timeZone: calendar.timeZone).year().month().day())
        let who = child?.name.map(Self.safeFileName).flatMap { $0.isEmpty ? nil : $0 } ?? String(localized: .exportPdfFileNameChat)
        return String(localized: .exportPdfFileName(who, day))
    }

    private static func safeFileName(_ text: String) -> String {
        let banned = CharacterSet(charactersIn: "/\\:?*\"<>|").union(.newlines).union(.controlCharacters)
        return String(text.unicodeScalars.filter { !banned.contains($0) }).trimmingCharacters(in: .whitespaces)
    }
}
