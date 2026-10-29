import Foundation
import SwiftData
import Testing
@testable import MomChat

@MainActor
struct OnboardingDraftTests {
    private let calendar = Calendar(identifier: .gregorian)
    private var today: Date { calendar.date(from: DateComponents(year: 2026, month: 10, day: 29, hour: 15))! }

    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: today))!
    }

    private func draft(_ path: OnboardingDraft.Path) -> OnboardingDraft {
        var draft = OnboardingDraft(today: today, calendar: calendar)
        draft.path = path
        return draft
    }

    // MARK: Validation

    @Test func dueDateAcceptedFromTwoWeeksAgoToFortyWeeksAhead() {
        var draft = draft(.expecting)
        for (offset, valid) in [(-15, false), (-14, true), (0, true), (280, true), (281, false)] {
            draft.pregnancy.dueDate = day(offset)
            #expect(draft.isPregnancyValid == valid, "due date \(offset) days from today")
        }
    }

    @Test func lastPeriodGivesDueDate280DaysLater() {
        var draft = draft(.expecting)
        draft.pregnancy.source = .lastPeriod
        draft.pregnancy.lastPeriod = day(-58)
        #expect(draft.resolvedDueDate == day(222))
        #expect(draft.isPregnancyValid)

        draft.pregnancy.lastPeriod = day(-295)
        #expect(!draft.isPregnancyValid)
    }

    @Test func lastPeriodRangeMatchesDueDateRange() {
        let draft = draft(.expecting)
        #expect(PregnancyDates.dueDate(lastPeriod: draft.lastPeriodRange.lowerBound, calendar: calendar) == draft.dueDateRange.lowerBound)
        #expect(PregnancyDates.dueDate(lastPeriod: draft.lastPeriodRange.upperBound, calendar: calendar) == draft.dueDateRange.upperBound)
    }

    @Test func birthDateNotInFutureNorOverThreeYearsAgo() {
        var draft = draft(.born)
        draft.birth.birthDate = day(1)
        #expect(!draft.isBirthValid)
        draft.birth.birthDate = day(0)
        #expect(draft.isBirthValid)
        draft.birth.birthDate = calendar.date(byAdding: .year, value: -3, to: day(0))!
        #expect(draft.isBirthValid)
        draft.birth.birthDate = calendar.date(byAdding: .day, value: -1, to: draft.birth.birthDate)!
        #expect(!draft.isBirthValid)
    }

    @Test func noPathIsIncomplete() {
        #expect(!OnboardingDraft(today: today, calendar: calendar).isComplete)
    }

    @Test func bothNeedsBothParts() {
        var draft = draft(.both)
        #expect(draft.isComplete)
        draft.birth.birthDate = day(5)
        #expect(!draft.isComplete)
    }

    @Test func babyCountKeepsWhatWasTyped() {
        var draft = draft(.born)
        draft.birth.babies[0].name = "Kuba"
        draft.setBabyCount(3)
        #expect(draft.birth.babies.count == 3)
        #expect(draft.birth.babies[0].name == "Kuba")
        draft.setBabyCount(0)
        #expect(draft.birth.babies.count == 1)
        #expect(draft.birth.babies[0].name == "Kuba")
    }

    @Test func listsSplitOnCommasAndNewLines() {
        #expect(OnboardingDraft.list(" egg, peanuts ;\nmilk,, ") == ["egg", "peanuts", "milk"])
        #expect(OnboardingDraft.list("   ") == [])
    }

    // MARK: Saving

    @Test func expectingSavesOnePregnancy() throws {
        let container = try DataStore.makeInMemoryContainer()
        var draft = draft(.expecting)
        draft.pregnancy.dueDate = day(109)
        draft.pregnancy.isFirstPregnancy = true
        draft.pregnancy.name = "  "
        draft.pregnancy.doctorNotes = "low iron, placenta position"

        let mom = draft.save(in: container.mainContext)
        try container.mainContext.save()

        #expect(mom.previousBirths == 0)
        let child = try #require(mom.activeChild)
        #expect(child.stage == .expecting)
        #expect(child.dueDate == day(109))
        #expect(child.name == nil)
        #expect(child.pregnancyConditions == ["low iron", "placenta position"])
        #expect(child.pregnancy(on: today, calendar: calendar)?.weeks == 24)
        #expect(try container.mainContext.fetchCount(FetchDescriptor<Child>()) == 1)
    }

    @Test func twinPregnancyStaysOneProfile() throws {
        let container = try DataStore.makeInMemoryContainer()
        var draft = draft(.expecting)
        draft.pregnancy.babies = 2

        let child = try #require(draft.save(in: container.mainContext).activeChild)
        #expect(child.multiples == 2)
        #expect(child.multipleBirthID == nil)
        #expect(try container.mainContext.fetchCount(FetchDescriptor<Child>()) == 1)
    }

    @Test func bornSavesChildWithDetails() throws {
        let container = try DataStore.makeInMemoryContainer()
        var draft = draft(.born)
        let birth = calendar.date(byAdding: .month, value: -7, to: day(0))!
        draft.birth.birthDate = birth
        draft.birth.babies[0] = .init(name: "Emma", sex: .girl, allergies: "egg", conditions: "")
        draft.birth.deliveryType = .cesarean
        draft.birth.feeding = .breast

        let mom = draft.save(in: container.mainContext)

        #expect(mom.previousBirths == nil)
        let emma = try #require(mom.activeChild)
        #expect(emma.name == "Emma")
        #expect(emma.stage == .born)
        #expect(emma.birthDate == birth)
        #expect(emma.dueDate == nil)
        #expect(emma.sex == .girl)
        #expect(emma.deliveryType == .cesarean)
        #expect(emma.feeding == .breast)
        #expect(emma.allergies == ["egg"])
        #expect(emma.conditions == [])
        #expect(emma.multipleBirthID == nil)
        #expect(emma.correctedAge(on: today, calendar: calendar) == nil)
    }

    @Test func bornEarlySetsDueDateForCorrectedAge() throws {
        let container = try DataStore.makeInMemoryContainer()
        var draft = draft(.born)
        draft.birth.birthDate = day(-10)
        draft.birth.bornEarly = true
        draft.birth.weeksEarly = 8

        let baby = try #require(draft.save(in: container.mainContext).activeChild)
        #expect(baby.dueDate == day(46))
        #expect(baby.correctedAge(on: today, calendar: calendar) == .beforeDueDate(days: 46))
    }

    @Test func twinsBornSaveOneChildEachWithSharedID() throws {
        let container = try DataStore.makeInMemoryContainer()
        var draft = draft(.born)
        draft.setBabyCount(2)
        draft.birth.babies[0].name = "Kuba"
        draft.birth.babies[1].name = "Ola"
        draft.birth.feeding = .mixed

        let mom = draft.save(in: container.mainContext)
        try container.mainContext.save()

        let children = try container.mainContext.fetch(FetchDescriptor<Child>())
        #expect(children.count == 2)
        #expect(Set(children.compactMap(\.name)) == ["Kuba", "Ola"])
        #expect(children.allSatisfy { $0.multiples == 2 && $0.feeding == .mixed })
        let groupID = try #require(children.first?.multipleBirthID)
        #expect(children.allSatisfy { $0.multipleBirthID == groupID })
        #expect(mom.activeChild?.name == "Kuba")
    }

    @Test func bothSavesBabyAndPregnancyAndOpensOnPregnancy() throws {
        let container = try DataStore.makeInMemoryContainer()
        var draft = draft(.both)
        draft.pregnancy.isFirstPregnancy = true  // not asked on this path, so ignored
        draft.birth.birthDate = calendar.date(byAdding: .year, value: -1, to: day(0))!

        let mom = draft.save(in: container.mainContext)
        try container.mainContext.save()

        #expect(mom.previousBirths == 1)
        #expect(mom.activeChild?.stage == .expecting)
        let stages = try container.mainContext.fetch(FetchDescriptor<Child>()).map(\.stage)
        #expect(stages.sorted { $0.rawValue < $1.rawValue } == [.born, .expecting])
    }

    @Test func savedProfileComesBackAfterRelaunch() throws {
        let directory = URL.temporaryDirectory.appending(path: "store-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }

        do {
            let container = try DataStore.makeContainer(directory: directory)
            var draft = draft(.born)
            draft.birth.babies[0].name = "Emma"
            draft.save(in: container.mainContext)
            try container.mainContext.save()
        }

        let reopened = try DataStore.makeContainer(directory: directory)
        let mom = try #require(try reopened.mainContext.fetch(FetchDescriptor<MomProfile>()).first)
        #expect(mom.activeChild?.name == "Emma")
    }
}

@MainActor
struct ChatHeaderTests {
    private let calendar = Calendar(identifier: .gregorian)
    private let english = Locale(identifier: "en_US")
    private var today: Date { calendar.date(from: DateComponents(year: 2026, month: 10, day: 29, hour: 15))! }

    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: today))!
    }

    private func header(_ child: Child?) -> ChatHeader {
        ChatHeader(child: child, on: today, calendar: calendar, locale: english)
    }

    @Test func pregnancyShowsWeekAndTrimester() {
        let header = header(Child(stage: .expecting, dueDate: day(109)))
        #expect(header.title == "Week 24")
        #expect(header.subtitle == "2nd trimester")
    }

    @Test func bornShowsNameAndAge() {
        let birth = calendar.date(byAdding: .month, value: -7, to: day(0))!
        let header = header(Child(name: "Emma", stage: .born, birthDate: birth))
        #expect(header.title == "Emma · 7 months")
        #expect(header.subtitle == nil)
    }

    @Test func unnamedBabyBornToday() {
        #expect(header(Child(stage: .born, birthDate: day(0))).title == "Baby · born today")
        #expect(header(Child(stage: .born, birthDate: day(-1))).title == "Baby · 1 day")
    }

    @Test func pretermShowsCorrectedAge() {
        let birth = calendar.date(byAdding: .month, value: -7, to: day(0))!
        let due = calendar.date(byAdding: .day, value: 28, to: birth)!
        let header = header(Child(name: "Emma", stage: .born, dueDate: due, birthDate: birth))
        #expect(header.subtitle?.hasPrefix("Corrected age ") == true)

        let early = self.header(Child(stage: .born, dueDate: day(46), birthDate: day(-10)))
        #expect(early.subtitle == "6 weeks 4 days before due date")
    }

    @Test func noChildOrArchivedShowsAppName() {
        #expect(header(nil).title == "MomChat")
        #expect(header(Child(stage: .archived, dueDate: day(60))).title == "MomChat")
    }
}
