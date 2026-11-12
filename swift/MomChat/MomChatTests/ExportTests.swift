import Foundation
import PDFKit
import SwiftData
import Testing
@testable import MomChat

@MainActor
struct ConversationReportTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Warsaw")!
        return calendar
    }
    private let locale = Locale(identifier: "en_GB")
    private var today: Date { calendar.date(from: DateComponents(year: 2026, month: 11, day: 12, hour: 3, minute: 14))! }

    private func day(_ offset: Int, hour: Int = 3, minute: Int = 14) -> Date {
        let start = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: today))!
        return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: start)!
    }

    private func conversation(_ child: Child?, in context: ModelContext, _ messages: [(Message.Role, String, Date)]) -> Conversation {
        let conversation = Conversation(child: child, createdAt: messages.first?.2 ?? today)
        context.insert(conversation)
        for (role, text, date) in messages {
            let message = Message(role: role, text: text, createdAt: date)
            message.conversation = conversation
        }
        conversation.title = messages.first.map { ConversationTitle.make(from: $0.1) }
        return conversation
    }

    private func report(_ conversation: Conversation, mom: MomProfile? = nil) -> ConversationReport {
        ConversationReport(conversation: conversation, mom: mom, now: today, calendar: calendar, locale: locale)
    }

    private func value(_ label: String, in report: ConversationReport) -> String? {
        report.sections.flatMap(\.rows).first { $0.label == label }?.value
    }

    @Test func bornPreemieHasDatesAgeAndCorrectedAge() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let birth = calendar.date(byAdding: .month, value: -7, to: calendar.startOfDay(for: today))!
        let child = Child(name: "Emma", stage: .born, birthDate: birth)
        child.setWeeksEarly(4, calendar: calendar)
        child.sex = .girl
        child.feeding = .breast
        child.deliveryType = .cesarean
        child.allergies = ["eggs", " ", "peanuts"]
        context.insert(child)
        let chat = conversation(child, in: context, [(.user, "Is spit-up normal?", today), (.assistant, "Yes, **often** it is.", today.addingTimeInterval(20))])

        let report = report(chat)
        #expect(report.title == "Is spit-up normal?")
        #expect(report.period.hasPrefix("Chat from 12 November 2026"))
        #expect(report.period.contains("03:14"))
        #expect(report.sections.first?.title == "Baby")
        #expect(value("Name", in: report) == "Emma")
        #expect(value("Sex", in: report) == "Girl")
        #expect(value("Birth date", in: report) == "12 April 2026")
        #expect(value("Age when asked", in: report) == "7 months (corrected age 6 months)")
        #expect(value("Born early", in: report) == "4 weeks")
        #expect(value("Delivery", in: report) == "C-section")
        #expect(value("Feeding", in: report) == "Breastfeeding")
        #expect(value("Allergies", in: report) == "eggs, peanuts")
        #expect(value("Due date", in: report) == nil)
    }

    @Test func pregnancyShowsWeekOnTheDayOfTheChat() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let child = Child(stage: .expecting, dueDate: day(PregnancyDates.termDays - 24 * 7 - 3), multiples: 2)
        child.pregnancyConditions = ["low iron"]
        context.insert(child)
        // Asked ten days ago: 23 weeks 0 days then, not 24w3d as today.
        let chat = conversation(child, in: context, [(.user, "Cramping?", day(-10))])

        let report = report(chat)
        #expect(report.sections.first?.title == "Pregnancy")
        #expect(value("Due date", in: report) == ConversationReport.date(child.dueDate!, calendar: calendar, locale: locale))
        #expect(value("Week when asked", in: report) == "23 weeks · 2nd trimester")
        #expect(value("Babies", in: report) == "2")
        #expect(value("Being monitored", in: report) == "low iron")
    }

    @Test func pregnancyChatOnABornBabyShowsTheWeekItWasAskedIn() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let child = Child(name: "Leo", stage: .born, dueDate: day(0), birthDate: day(-3))
        context.insert(child)
        let chat = conversation(child, in: context, [(.user, "Back pain?", day(-30))])

        let report = report(chat)
        #expect(report.sections.first?.title == "Baby")
        #expect(value("Week when asked", in: report)?.hasPrefix("35 weeks") == true)
        #expect(value("Age when asked", in: report) == nil)
    }

    @Test func endedPregnancyIsMarkedAndItsNotesLeftOut() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let child = Child(stage: .archived, dueDate: day(100))
        let note = ProfileNote(text: "nausea in mornings")
        note.child = child
        context.insert(child)
        let chat = conversation(child, in: context, [(.user, "Hi", today)])

        let report = report(chat)
        #expect(value("Status", in: report) == "Pregnancy ended")
        #expect(!report.sections.contains { $0.title == "Saved from chats" })
    }

    @Test func notesAndMomDetails() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let child = Child(name: "Emma", stage: .born, birthDate: day(-100))
        context.insert(child)
        for index in 0..<7 {
            let note = ProfileNote(text: "note \(index)", createdAt: day(-index))
            note.child = child
        }
        let mom = MomProfile(name: "Ania", previousBirths: 0)
        mom.conditions = ["thyroid"]
        context.insert(mom)
        let chat = conversation(child, in: context, [(.user, "Hi", today)])

        let report = report(chat, mom: mom)
        let notes = try #require(report.sections.first { $0.title == "Saved from chats" })
        #expect(notes.rows.map(\.value) == ["note 0", "note 1", "note 2", "note 3", "note 4"])
        #expect(notes.rows.first?.label == "12 November 2026")
        let momSection = try #require(report.sections.first { $0.title == "Mom" })
        #expect(momSection.rows.map(\.value) == ["Ania", "0", "thyroid"])
    }

    @Test func entriesMarkFootnotesEmergenciesMissingAnswersAndNewDays() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let child = Child(stage: .born, birthDate: day(-50))
        context.insert(child)
        let chat = conversation(child, in: context, [
            (.user, "Fever 38.5?", day(0, hour: 3, minute: 14)),
            (.assistant, "Call your doctor.", day(0, hour: 3, minute: 15)),
            (.user, "not breathing", day(0, hour: 3, minute: 20)),
            (.user, "Next day question", day(1, hour: 9, minute: 5)),
        ])
        let messages = chat.sortedMessages
        messages[1].showsDisclaimer = true
        messages[2].emergency = .babyNotBreathing

        let entries = report(chat).entries
        #expect(entries.map(\.kind) == [.question, .answer, .question, .notice, .day, .question, .notice])
        #expect(entries[0].time == "03:14")
        #expect(entries[1].footnote == "Please check with your pediatrician or midwife.")
        #expect(entries[3].text.contains("emergency screen"))
        #expect(entries[4].time == "13 November 2026")
        #expect(entries[6].text == "No answer was given to this question.")
    }

    @Test func fileNameIsSafe() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let named = Child(name: "Em/ma:", stage: .born, birthDate: day(-5))
        let unnamed = Child(stage: .expecting, dueDate: day(100))
        context.insert(named)
        context.insert(unnamed)

        #expect(report(conversation(named, in: context, [(.user, "Hi", today)])).fileName == "MomChat Emma 2026-11-12")
        #expect(report(conversation(unnamed, in: context, [(.user, "Hi", today)])).fileName == "MomChat Chat 2026-11-12")
    }
}

@MainActor
struct ConversationPDFTests {
    private func report(entries: Int) -> ConversationReport {
        ConversationReport(
            title: "Is spit-up normal?",
            period: "Chat from 12 November 2026",
            sections: [.init(title: "Baby", rows: [.init(label: "Name", value: "Emma"), .init(label: "Age when asked", value: "7 months")])],
            entries: (0..<entries).flatMap { index in [
                ConversationReport.Entry(kind: .question, time: "03:14", text: "Question number \(index)"),
                ConversationReport.Entry(kind: .answer, time: "03:15", text: "It's **usually** fine.\n- Keep her upright\n- Smaller feeds", footnote: "Please check with your pediatrician or midwife."),
            ] },
            footer: "Made on this iPhone with MomChat.",
            fileName: "MomChat Emma 2026-11-12"
        )
    }

    @Test func shortChatIsOneA4PageWithEverything() throws {
        let data = ConversationPDF.data(for: report(entries: 2), pageSize: .a4)
        let pdf = try #require(PDFDocument(data: data))
        #expect(pdf.pageCount == 1)
        let page = try #require(pdf.page(at: 0))
        #expect(abs(page.bounds(for: .mediaBox).width - 595.2) < 1)
        let text = try #require(pdf.string)
        for expected in ["Is spit-up normal?", "Emma", "Question number 1", "usually", "Keep her upright", "Made on this iPhone", "1 / 1"] {
            #expect(text.contains(expected), "missing \(expected)")
        }
        #expect(!text.contains("**"))
    }

    @Test func longChatBreaksIntoNumberedPages() throws {
        let data = ConversationPDF.data(for: report(entries: 60), pageSize: .letter)
        let pdf = try #require(PDFDocument(data: data))
        #expect(pdf.pageCount > 3)
        let last = try #require(pdf.page(at: pdf.pageCount - 1)?.string)
        #expect(last.contains("\(pdf.pageCount) / \(pdf.pageCount)"))
        #expect(pdf.string?.contains("Question number 59") == true)
        #expect(abs(pdf.page(at: 0)!.bounds(for: .mediaBox).width - 612) < 1)
    }

    @Test func pageSizeFollowsMeasurementSystem() {
        #expect(ConversationPDF.PageSize.current(Locale(identifier: "en_US")) == .letter)
        #expect(ConversationPDF.PageSize.current(Locale(identifier: "pl_PL")) == .a4)
        #expect(ConversationPDF.PageSize.current(Locale(identifier: "en_GB")) == .a4)
    }

    @Test func exportWritesOnlyTheLatestFile() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let child = Child(name: "Emma", stage: .born, birthDate: .now.addingTimeInterval(-86_400 * 30))
        context.insert(child)
        let empty = Conversation(child: child)
        context.insert(empty)
        let chat = Conversation(child: child)
        context.insert(chat)
        Message(role: .user, text: "Hi", createdAt: .now).conversation = chat
        try context.save()

        #expect(throws: ConversationExport.Failure.self) { try ConversationExport.write(empty.persistentModelID, in: context) }
        let first = try ConversationExport.write(chat.persistentModelID, in: context)
        let second = try ConversationExport.write(chat.persistentModelID, in: context)
        #expect(first.pathExtension == "pdf")
        #expect(FileManager.default.fileExists(atPath: second.path(percentEncoded: false)))
        #expect(try FileManager.default.contentsOfDirectory(atPath: second.deletingLastPathComponent().path(percentEncoded: false)).count == 1)
        ConversationExport.removeTemporaryFiles()
    }
}
