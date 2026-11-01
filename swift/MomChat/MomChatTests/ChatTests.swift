import Foundation
import FoundationModels
import SwiftData
import Testing
@testable import MomChat

@MainActor
struct ProfileBlockTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Warsaw")!
        return calendar
    }
    private var today: Date { calendar.date(from: DateComponents(year: 2026, month: 11, day: 1, hour: 15))! }

    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: today))!
    }

    private func monthsAgo(_ months: Int) -> Date {
        calendar.date(byAdding: .month, value: -months, to: calendar.startOfDay(for: today))!
    }

    @Test func expectingMatchesPlanExample() {
        let mom = MomProfile(previousBirths: 0)
        mom.conditions = ["hypothyroidism"]
        mom.medications = ["levothyroxine"]
        let child = Child(stage: .expecting, dueDate: day(PregnancyDates.termDays - 24 * 7 - 3))
        child.pregnancyConditions = ["glucose test scheduled"]

        let block = ProfileBlock.make(mom: mom, child: child, on: today, calendar: calendar)
        #expect(block == """
            Mom: first pregnancy. Conditions: hypothyroidism. Medications: levothyroxine.
            Pregnant: 24 weeks 3 days (2nd trimester), due Feb 18, singleton.
            Pregnancy notes: glucose test scheduled.
            """)
    }

    @Test func bornPreemieMatchesPlanExample() {
        let birth = monthsAgo(7)
        let child = Child(name: "Emma", stage: .born, dueDate: calendar.date(byAdding: .day, value: 28, to: birth), birthDate: birth)
        child.sex = .girl
        child.deliveryType = .cesarean
        child.feeding = .breast
        child.conditions = ["mild reflux"]

        let block = ProfileBlock.make(mom: MomProfile(previousBirths: 0), child: child, on: today, calendar: calendar)
        #expect(block == """
            Mom: 7 months postpartum, C-section, first baby.
            Child: Emma, girl, 7 months (corrected 6 months, born 4 weeks early).
            Feeding: breastfed.
            Allergies: none known. Conditions: mild reflux.
            """)
    }

    @Test func momLineShrinksAfterTheFirstYear() {
        let child = Child(name: "Leo", stage: .born, birthDate: monthsAgo(14))
        child.deliveryType = .vaginal
        let block = ProfileBlock.make(mom: MomProfile(), child: child, on: today, calendar: calendar)
        #expect(!block.contains("postpartum"))
        #expect(!block.contains("vaginal"))
        #expect(block.hasPrefix("Child: Leo, 14 months."))
    }

    @Test func twinsAndOtherChildrenAreNamed() {
        let kuba = Child(name: "Kuba", stage: .born, birthDate: day(-10))
        let ola = Child(name: "Ola", stage: .born, birthDate: day(-10))
        let pregnancy = Child(stage: .expecting, dueDate: day(100))
        let block = ProfileBlock.make(mom: nil, child: ola, twins: [kuba], others: [pregnancy], on: today, calendar: calendar)
        #expect(block.contains("Child: Ola, 10 days. Twin of Kuba."))
        #expect(block.contains("Her other children: a pregnancy at 25 weeks."))
    }

    @Test func multiplesPregnancy() {
        let child = Child(name: "Kuba", stage: .expecting, dueDate: day(70), multiples: 2)
        child.sex = .boy
        let block = ProfileBlock.make(mom: nil, child: child, on: today, calendar: calendar)
        #expect(block.contains("twins."))
        #expect(block.contains("Baby: named Kuba, boys."))
    }

    @Test func archivedPregnancySaysNothingAboutIt() {
        let child = Child(stage: .archived, dueDate: day(100))
        #expect(ProfileBlock.make(mom: MomProfile(previousBirths: 0), child: child, on: today, calendar: calendar).isEmpty)
    }

    @Test func onlyTheFiveNewestNotesOldestFirst() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let child = Child(name: "Emma", stage: .born, birthDate: monthsAgo(7))
        context.insert(child)
        for index in 1...7 {
            let note = ProfileNote(text: "note \(index)", createdAt: day(-30 + index))
            context.insert(note)
            note.child = child
        }
        let block = ProfileBlock.make(mom: nil, child: child, on: today, calendar: calendar)
        let notes = try #require(block.split(separator: "\n").last)
        #expect(notes == "Recent notes: note 3 (Oct 5); note 4 (Oct 6); note 5 (Oct 7); note 6 (Oct 8); note 7 (Oct 9).")
    }

    /// PLAN.md budget: ≤ 150 tokens for mom + child, ~4 characters a token.
    @Test func fullProfileStaysInBudget() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile(previousBirths: 0)
        mom.conditions = ["hypothyroidism", "asthma", "anemia", "migraines", "back problems"]
        mom.medications = ["levothyroxine", "inhaler"]
        context.insert(mom)
        let birth = monthsAgo(7)
        let child = Child(name: "Emma", stage: .born, dueDate: calendar.date(byAdding: .day, value: 28, to: birth), birthDate: birth)
        child.sex = .girl
        child.deliveryType = .cesarean
        child.feeding = .solidsAndMilk
        child.allergies = ["cow's milk protein", "egg"]
        child.conditions = ["mild reflux", "eczema"]
        context.insert(child)
        for index in 1...5 {
            let note = ProfileNote(text: "a fairly long note about something that happened, number \(index) of five", createdAt: day(-index))
            context.insert(note)
            note.child = child
        }
        let block = ProfileBlock.make(mom: mom, child: child, others: [Child(name: "Leo", stage: .born, birthDate: monthsAgo(30))], on: today, calendar: calendar)
        #expect(block.count <= 750, "\(block.count) characters:\n\(block)")
        #expect(block.contains("and 1 more"))
    }

    @Test func longEntriesAreClipped() {
        let clipped = ProfileBlock.clip(String(repeating: "word ", count: 30))
        #expect(clipped.count <= ProfileBlock.itemLength)
        #expect(clipped.hasSuffix("…"))
    }

    @Test func instructionsStayInBudget() {
        let instructions = Instructions.make(profileBlock: "", on: today, calendar: calendar)
        // ~500 tokens.
        #expect(instructions.count <= 2_400, "\(instructions.count) characters")
        #expect(instructions.contains("Today is Sunday, November 1, 2026."))
        #expect(instructions.contains("Always answer in English."))
    }
}

struct ChatHistoryTests {
    @Test func pairsQuestionsWithAnswers() {
        let turns = ChatHistory.turns(from: [
            (.user, "refused question"),
            (.user, "q1"), (.assistant, "a1"),
            (.assistant, "orphan answer"),
            (.user, "q2"), (.assistant, "a2"),
            (.user, "unanswered"),
        ])
        #expect(turns == [.init(question: "q1", answer: "a1"), .init(question: "q2", answer: "a2")])
    }

    @Test func keepsTheNewestTurnsThatFit() {
        let messages: [(role: Message.Role, text: String)] = (1...5).flatMap { index in
            [(Message.Role.user, "q\(index)"), (.assistant, String(repeating: "x", count: 98))]
        }
        let turns = ChatHistory.turns(from: messages, budget: 300)
        #expect(turns.map(\.question) == ["q3", "q4", "q5"])
    }

    @Test func transcriptHasInstructionsThenTurns() {
        let transcript = ChatHistory.transcript(instructions: "be kind", turns: [.init(question: "q", answer: "a")])
        #expect(transcript.count == 3)
        guard case .instructions = transcript.first else {
            Issue.record("first entry should be instructions")
            return
        }
        guard case .response = transcript.last else {
            Issue.record("last entry should be the answer")
            return
        }
    }
}

struct ChatFailureTests {
    private let context = LanguageModelSession.GenerationError.Context(debugDescription: "test")

    @Test func mapsModelErrors() {
        #expect(ChatFailure(LanguageModelSession.GenerationError.guardrailViolation(context)) == .declined)
        #expect(ChatFailure(LanguageModelSession.GenerationError.unsupportedLanguageOrLocale(context)) == .unsupportedLanguage)
        #expect(ChatFailure(LanguageModelSession.GenerationError.exceededContextWindowSize(context)) == .tooLong)
        #expect(ChatFailure(LanguageModelSession.GenerationError.assetsUnavailable(context)) == .modelUnavailable)
        #expect(ChatFailure(LanguageModelSession.GenerationError.rateLimited(context)) == .retryable)
        #expect(ChatFailure(URLError(.unknown)) == .retryable)
    }

    @Test func onlySomeCanBeRetried() {
        #expect(ChatFailure.retryable.canRetry)
        #expect(!ChatFailure.declined.canRetry)
        #expect(!ChatFailure.tooLong.canRetry)
    }
}

@MainActor
struct ConversationTests {
    @Test func titleIsTheFirstLineShortened() {
        #expect(ConversationTitle.make(from: "  Is cramping normal?\nAlso back pain") == "Is cramping normal?")
        let long = "My baby has been crying every evening for about three hours and nothing seems to help at all"
        let title = ConversationTitle.make(from: long)
        #expect(title.count <= ConversationTitle.maxLength + 1)
        #expect(title.hasSuffix("…"))
        #expect(!title.dropLast().hasSuffix(" "))
    }

    @Test func resumesOnlyARecentChat() {
        let now = Date(timeIntervalSince1970: 1_000_000)
        let recent = Conversation(child: nil, createdAt: now.addingTimeInterval(-5 * 3600))
        let old = Conversation(child: nil, createdAt: now.addingTimeInterval(-7 * 3600))
        #expect(ConversationResume.conversation(from: [recent, old], now: now) === recent)
        #expect(ConversationResume.conversation(from: [old], now: now) == nil)
        #expect(ConversationResume.conversation(from: [], now: now) == nil)
    }

    @Test func searchMatchesTitlesAndMessages() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let sleep = Conversation(child: nil)
        sleep.title = "How much should she sleep?"
        let rash = Conversation(child: nil)
        rash.title = "Red spots"
        context.insert(sleep)
        context.insert(rash)
        let message = Message(role: .assistant, text: "Small red spots on the cheeks are often baby acne, which clears up by itself.")
        context.insert(message)
        message.conversation = rash

        #expect(ConversationSearch.search("", in: [sleep, rash]).count == 2)
        #expect(ConversationSearch.search("SLEEP", in: [sleep, rash]).map(\.conversation) == [sleep])
        let hits = ConversationSearch.search("acne", in: [sleep, rash])
        #expect(hits.map(\.conversation) == [rash])
        #expect(hits.first?.snippet?.contains("baby acne") == true)
        #expect(ConversationSearch.search("teeth", in: [sleep, rash]).isEmpty)
    }

    @Test func snippetStartsNearTheMatch() {
        let text = String(repeating: "filler ", count: 30) + "the match is here" + String(repeating: " tail", count: 30)
        let snippet = ConversationSearch.snippet(text, around: "match")
        #expect(snippet.hasPrefix("…"))
        #expect(snippet.hasSuffix("…"))
        #expect(snippet.contains("the match is here"))
    }
}

@MainActor
struct StarterChipTests {
    private let calendar = Calendar(identifier: .gregorian)
    private let today = Calendar(identifier: .gregorian).date(from: DateComponents(year: 2026, month: 11, day: 1))!

    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: today)!
    }

    @Test func pregnancyChipsFollowTheTrimester() {
        let first = Child(stage: .expecting, dueDate: day(PregnancyDates.termDays - 8 * 7))
        let second = Child(stage: .expecting, dueDate: day(PregnancyDates.termDays - 24 * 7))
        let third = Child(stage: .expecting, dueDate: day(PregnancyDates.termDays - 36 * 7))
        #expect(StarterChip.chips(for: first, on: today, calendar: calendar).contains(.nausea))
        #expect(StarterChip.chips(for: second, on: today, calendar: calendar).contains(.babyKicks))
        #expect(StarterChip.chips(for: third, on: today, calendar: calendar).contains(.hospitalBag))
    }

    @Test func babyChipsFollowTheAge() {
        let newborn = Child(stage: .born, birthDate: day(-20))
        #expect(StarterChip.chips(for: newborn, on: today, calendar: calendar) == [.sleep, .feedingEnough, .crying, .poop])
        newborn.deliveryType = .cesarean
        #expect(StarterChip.chips(for: newborn, on: today, calendar: calendar).last == .cesareanRecovery)

        let baby = Child(stage: .born, birthDate: calendar.date(byAdding: .month, value: -6, to: today)!)
        #expect(StarterChip.chips(for: baby, on: today, calendar: calendar).contains(.solids))
        let toddler = Child(stage: .born, birthDate: calendar.date(byAdding: .month, value: -20, to: today)!)
        #expect(StarterChip.chips(for: toddler, on: today, calendar: calendar).contains(.tantrums))
    }

    @Test func noChipsForAnArchivedPregnancy() {
        #expect(StarterChip.chips(for: Child(stage: .archived, dueDate: day(100)), on: today, calendar: calendar).isEmpty)
        #expect(StarterChip.chips(for: nil).isEmpty)
    }

    @Test func everyChipHasALabelAndAQuestion() {
        for chip in StarterChip.allCases {
            #expect(!String(localized: chip.label).isEmpty)
            #expect(String(localized: chip.question).hasSuffix("?"), "\(chip) question")
        }
    }
}
