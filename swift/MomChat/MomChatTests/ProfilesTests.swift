import Foundation
import SwiftData
import Testing
@testable import MomChat

@MainActor
struct ProfilesTests {
    private let calendar = Calendar(identifier: .gregorian)
    private var today: Date { calendar.date(from: DateComponents(year: 2026, month: 10, day: 31, hour: 15))! }

    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: today))!
    }

    /// A due date that puts the pregnancy at `weeks`w`days`d today.
    private func dueDate(atWeek weeks: Int, days: Int = 0) -> Date {
        day(PregnancyDates.termDays - weeks * 7 - days)
    }

    // MARK: Birth banner

    @Test func bannerStartsEarlierForMultiples() {
        #expect(BirthBanner.startWeek(multiples: 1) == 37)
        #expect(BirthBanner.startWeek(multiples: 2) == 34)
        #expect(BirthBanner.startWeek(multiples: 3) == 32)
        #expect(BirthBanner.startWeek(multiples: 5) == 32)
    }

    @Test(arguments: [(1, 37), (2, 34), (3, 32)])
    func bannerShowsFromStartWeek(multiples: Int, week: Int) {
        let child = Child(stage: .expecting, dueDate: dueDate(atWeek: week - 1, days: 6), multiples: multiples)
        #expect(!BirthBanner.isShown(for: child, dismissedOn: nil, on: today, calendar: calendar))
        child.dueDate = dueDate(atWeek: week)
        #expect(BirthBanner.isShown(for: child, dismissedOn: nil, on: today, calendar: calendar))
    }

    @Test func bannerShowsPastDueDate() {
        let child = Child(stage: .expecting, dueDate: day(-3))
        #expect(BirthBanner.isShown(for: child, dismissedOn: nil, on: today, calendar: calendar))
    }

    @Test func notYetHidesBannerUntilTomorrow() {
        let child = Child(stage: .expecting, dueDate: day(1))
        let dismissed = calendar.date(byAdding: .hour, value: -10, to: today)!
        #expect(!BirthBanner.isShown(for: child, dismissedOn: dismissed, on: today, calendar: calendar))
        #expect(BirthBanner.isShown(for: child, dismissedOn: dismissed, on: day(1), calendar: calendar))
    }

    @Test func noBannerOnceBornOrArchived() {
        let born = Child(stage: .born, dueDate: day(1), birthDate: day(0))
        let archived = Child(stage: .archived, dueDate: day(1))
        #expect(!BirthBanner.isShown(for: born, dismissedOn: nil, on: today, calendar: calendar))
        #expect(!BirthBanner.isShown(for: archived, dismissedOn: nil, on: today, calendar: calendar))
    }

    // MARK: Birth form

    @Test func birthFormKeepsPregnancyNameAndSex() {
        let pregnancy = Child(name: "Emma", stage: .expecting, dueDate: day(1))
        pregnancy.sex = .girl
        let draft = BirthDraft(pregnancy: pregnancy, today: today, calendar: calendar)
        #expect(draft.babies.count == 1)
        #expect(draft.babies[0].name == "Emma")
        #expect(draft.babies[0].sex == .girl)
        #expect(draft.birthDate == day(0))
    }

    @Test func birthFormHasOneBlockPerExpectedBaby() {
        let pregnancy = Child(stage: .expecting, dueDate: day(20), multiples: 3)
        let draft = BirthDraft(pregnancy: pregnancy, today: today, calendar: calendar)
        #expect(draft.babies.count == 3)
        #expect(draft.babies.allSatisfy { $0.name.isEmpty })
    }

    @Test func birthDateFrom22WeeksToToday() {
        let pregnancy = Child(stage: .expecting, dueDate: day(100))
        var draft = BirthDraft(pregnancy: pregnancy, today: today, calendar: calendar)
        #expect(draft.birthDateRange.lowerBound == day(100 - 126))
        draft.birthDate = day(1)
        #expect(!draft.isValid)
        draft.birthDate = day(-26)
        #expect(draft.isValid)
        draft.birthDate = day(-27)
        #expect(!draft.isValid)
    }

    @Test func birthDateRangeNeverEmptyForAnEarlyPregnancy() {
        let pregnancy = Child(stage: .expecting, dueDate: day(270))
        let draft = BirthDraft(pregnancy: pregnancy, today: today, calendar: calendar)
        #expect(draft.birthDateRange.lowerBound <= draft.birthDateRange.upperBound)
    }

    @Test func recordingBirthKeepsChatOnTheSameRecord() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile()
        let pregnancy = Child(stage: .expecting, dueDate: day(1))
        context.insert(mom)
        context.insert(pregnancy)
        mom.activeChild = pregnancy

        var draft = BirthDraft(pregnancy: pregnancy, today: today, calendar: calendar)
        draft.babies[0].name = "  Zosia "
        draft.babies[0].feeding = .breast
        draft.deliveryType = .vaginal
        draft.record(into: pregnancy, in: context)
        try context.save()

        #expect(mom.activeChild === pregnancy)
        #expect(pregnancy.stage == .born)
        #expect(pregnancy.name == "Zosia")
        #expect(pregnancy.birthDate == day(0))
        #expect(pregnancy.dueDate == day(1))
        #expect(pregnancy.feeding == .breast)
        #expect(ChatHeader(child: pregnancy, on: day(1), calendar: calendar).title == "Zosia · 1 day")
    }

    @Test func twinBirthGivesTwoChildrenWithTheirOwnDetails() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let pregnancy = Child(stage: .expecting, dueDate: day(20), multiples: 2)
        context.insert(pregnancy)

        var draft = BirthDraft(pregnancy: pregnancy, today: today, calendar: calendar)
        draft.babies[0].name = "Ala"
        draft.babies[1].name = "Ola"
        draft.babies[1].feeding = .formula
        let twins = draft.record(into: pregnancy, in: context)
        try context.save()

        #expect(twins.map(\.name) == ["Ala", "Ola"])
        #expect(twins.map(\.feeding) == [nil, .formula])
        #expect(try context.fetchCount(FetchDescriptor<Child>()) == 2)
        #expect(try pregnancy.birthGroup(in: context).count == 2)
        // Born ~3 weeks early, so corrected age works for both.
        #expect(twins.allSatisfy { $0.weeksEarly(calendar: calendar) == 2 })
    }

    // MARK: Twin history

    @Test func siblingsSeePregnancyChatsButNotEachOthersBabyChats() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let pregnancy = Child(stage: .expecting, dueDate: day(20), multiples: 2, createdAt: day(-100))
        context.insert(pregnancy)
        let pregnancyChat = Conversation(child: pregnancy, createdAt: day(-50))
        context.insert(pregnancyChat)
        try context.save()

        let draft = BirthDraft(pregnancy: pregnancy, today: today, calendar: calendar)
        let twins = draft.record(into: pregnancy, in: context)
        let first = twins[0], second = twins[1]
        let firstBabyChat = Conversation(child: first, createdAt: .now.addingTimeInterval(60))
        let secondBabyChat = Conversation(child: second, createdAt: .now.addingTimeInterval(60))
        context.insert(firstBabyChat)
        context.insert(secondBabyChat)
        try context.save()

        let firstHistory = try first.history(in: context)
        let secondHistory = try second.history(in: context)
        #expect(firstHistory.count == 2)
        #expect(firstHistory.contains { $0 === pregnancyChat })
        #expect(!firstHistory.contains { $0 === secondBabyChat })
        #expect(secondHistory.count == 2)
        #expect(secondHistory.contains { $0 === pregnancyChat })
        #expect(!secondHistory.contains { $0 === firstBabyChat })
    }

    @Test func singletonHistoryIsItsOwn() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let child = Child(name: "Emma", stage: .born, birthDate: day(-30))
        context.insert(child)
        context.insert(Conversation(child: child))
        #expect(try child.history(in: context).count == 1)
    }

    // MARK: Born early editing

    @Test func weeksEarlyComesFromDueDate() {
        let child = Child(stage: .born, dueDate: day(45), birthDate: day(0))
        #expect(child.weeksEarly(calendar: calendar) == 6)
        child.dueDate = day(3)
        #expect(child.weeksEarly(calendar: calendar) == nil)
        child.dueDate = day(-2)
        #expect(child.weeksEarly(calendar: calendar) == nil)
        child.dueDate = nil
        #expect(child.weeksEarly(calendar: calendar) == nil)
    }

    @Test func settingWeeksEarlyMovesDueDate() {
        let child = Child(stage: .born, birthDate: day(-10))
        child.setWeeksEarly(5, calendar: calendar)
        #expect(child.dueDate == day(25))
        #expect(child.weeksEarly(calendar: calendar) == 5)
        child.setWeeksEarly(nil, calendar: calendar)
        #expect(child.dueDate == nil)
    }

    // MARK: Archive

    @Test func archivingMovesChatToNewestRemainingChild() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile()
        let older = Child(name: "Emma", stage: .born, birthDate: day(-400), createdAt: day(-10))
        let younger = Child(name: "Kuba", stage: .born, birthDate: day(-100), createdAt: day(-5))
        let pregnancy = Child(stage: .expecting, dueDate: day(150), createdAt: day(-1))
        [older, younger, pregnancy].forEach(context.insert)
        context.insert(mom)
        mom.activeChild = pregnancy
        context.insert(Conversation(child: pregnancy))

        try mom.archive(pregnancy, in: context)
        try context.save()

        #expect(pregnancy.stage == .archived)
        #expect(mom.activeChild === younger)
        #expect(pregnancy.conversations.count == 1)
        #expect(pregnancy.pregnancy(on: today, calendar: calendar) == nil)
    }

    @Test func archivingTheOnlyPregnancyLeavesNoActiveChild() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile()
        let pregnancy = Child(stage: .expecting, dueDate: day(150))
        context.insert(mom)
        context.insert(pregnancy)
        mom.activeChild = pregnancy

        try mom.archive(pregnancy, in: context)
        #expect(mom.activeChild == nil)
        #expect(ChatHeader(child: mom.activeChild).title == String(localized: .appName))
    }

    @Test func archivingAnotherPregnancyKeepsTheChat() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile()
        let baby = Child(name: "Emma", stage: .born, birthDate: day(-100))
        let pregnancy = Child(stage: .expecting, dueDate: day(150))
        [baby, pregnancy].forEach(context.insert)
        context.insert(mom)
        mom.activeChild = baby

        try mom.archive(pregnancy, in: context)
        #expect(mom.activeChild === baby)
    }

    @Test func restoringBringsPregnancyBack() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile()
        let pregnancy = Child(stage: .expecting, dueDate: day(150))
        context.insert(mom)
        context.insert(pregnancy)
        mom.activeChild = pregnancy

        try mom.archive(pregnancy, in: context)
        try mom.restore(pregnancy, in: context)
        #expect(pregnancy.stage == .expecting)
        #expect(mom.activeChild === pregnancy)
    }

    @Test func deletingArchivedPregnancyDeletesItsChats() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile()
        let pregnancy = Child(stage: .expecting, dueDate: day(150))
        context.insert(mom)
        context.insert(pregnancy)
        let chat = Conversation(child: pregnancy)
        context.insert(chat)
        chat.messages.append(Message(role: .user, text: "Is spotting normal?"))
        try mom.archive(pregnancy, in: context)
        try context.save()

        try mom.delete(pregnancy, in: context)
        try context.save()

        #expect(try context.fetchCount(FetchDescriptor<Child>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<Conversation>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<Message>()) == 0)
    }

    // MARK: Adding

    @Test func addingAPregnancyUsesTheSameMomAndMovesTheChat() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let mom = MomProfile(previousBirths: 1)
        let baby = Child(name: "Emma", stage: .born, birthDate: day(-200))
        context.insert(mom)
        context.insert(baby)
        mom.activeChild = baby

        var draft = OnboardingDraft(today: today, calendar: calendar)
        draft.isAddingToProfile = true
        draft.path = .expecting
        #expect(!draft.asksFirstPregnancy)
        draft.pregnancy.dueDate = day(200)
        let added = try #require(draft.addChildren(to: mom, in: context))
        try context.save()

        #expect(try context.fetchCount(FetchDescriptor<MomProfile>()) == 1)
        #expect(mom.previousBirths == 1)
        #expect(mom.activeChild === added)
        #expect(added.stage == .expecting)
        #expect(baby.stage == .born)
    }

    @Test func onboardingStillAsksFirstPregnancy() {
        var draft = OnboardingDraft(today: today, calendar: calendar)
        draft.path = .expecting
        #expect(draft.asksFirstPregnancy)
        draft.path = .both
        #expect(!draft.asksFirstPregnancy)
    }

    /// Done-when for Stage 5: pregnancy → born → second pregnancy, nothing lost.
    @Test func pregnancyThenBirthThenSecondPregnancyKeepsEverything() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext

        var onboarding = OnboardingDraft(today: today, calendar: calendar)
        onboarding.path = .expecting
        onboarding.pregnancy.dueDate = day(1)
        onboarding.pregnancy.name = "Emma"
        onboarding.pregnancy.doctorNotes = "low iron"
        let mom = onboarding.save(in: context)
        let first = try #require(mom.activeChild)
        let chat = Conversation(child: first)
        context.insert(chat)
        chat.messages.append(Message(role: .user, text: "Is cramping normal at 39 weeks?"))
        first.notes.append(ProfileNote(text: "low-lying placenta, resolved"))
        try context.save()

        BirthDraft(pregnancy: first, today: today, calendar: calendar).record(into: first, in: context)
        try context.save()

        var second = OnboardingDraft(today: today, calendar: calendar)
        second.isAddingToProfile = true
        second.path = .expecting
        second.pregnancy.dueDate = day(250)
        second.addChildren(to: mom, in: context)
        try context.save()

        let children = try context.fetch(FetchDescriptor<Child>(sortBy: [SortDescriptor(\.createdAt)]))
        #expect(children.map(\.stage) == [.born, .expecting])
        #expect(children[0].name == "Emma")
        #expect(children[0].pregnancyConditions == ["low iron"])
        #expect(children[0].conversations.first?.messages.count == 1)
        #expect(children[0].notes.count == 1)
        #expect(mom.activeChild === children[1])
    }

    // MARK: Profile rows

    @Test func profileSummaries() {
        let pregnancy = Child(stage: .expecting, dueDate: dueDate(atWeek: 24))
        #expect(ProfileSummary(child: pregnancy, on: today, calendar: calendar).title == "Pregnancy")
        #expect(ProfileSummary(child: pregnancy, on: today, calendar: calendar).subtitle.hasPrefix("Week 24 · due "))

        let twins = Child(stage: .expecting, dueDate: day(100), multiples: 2)
        #expect(ProfileSummary(child: twins, on: today, calendar: calendar).title == "Pregnancy with 2 babies")

        let newborn = Child(stage: .born, birthDate: day(0))
        let summary = ProfileSummary(child: newborn, on: today, calendar: calendar)
        #expect(summary.title == "Baby")
        #expect(summary.subtitle == "Born today")
    }
}
