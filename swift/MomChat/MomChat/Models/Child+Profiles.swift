import Foundation
import SwiftData

extension Child {
    /// This child and the twins/triplets born with it, oldest record first (the one that kept the pregnancy).
    func birthGroup(in context: ModelContext) throws -> [Child] {
        guard let groupID = multipleBirthID else { return [self] }
        let descriptor = FetchDescriptor<Child>(
            predicate: #Predicate { $0.multipleBirthID == groupID },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        return try context.fetch(descriptor)
    }

    /// Its own conversations, plus the pregnancy conversations that stayed on a twin's record.
    /// Those are the ones from before the group was split, i.e. before its newest record was created.
    func history(in context: ModelContext) throws -> [Conversation] {
        let group = try birthGroup(in: context)
        guard let splitAt = group.map(\.createdAt).max() else { return conversations }
        let shared = group
            .filter { $0 !== self }
            .flatMap(\.conversations)
            .filter { $0.createdAt < splitAt }
        return (conversations + shared).sorted { $0.updatedAt > $1.updatedAt }
    }

    /// Whole weeks between birth and due date. `nil` when born on time or late, or the due date is unknown.
    func weeksEarly(calendar: Calendar = .current) -> Int? {
        guard let birthDate, let dueDate else { return nil }
        let weeks = calendar.daysBetween(birthDate, dueDate) / 7
        return weeks >= 1 ? weeks : nil
    }

    /// For a born child whose due date wasn't asked (onboarding asks "weeks early"): due date = birth + weeks.
    /// `nil` clears the due date, so there's no corrected age.
    func setWeeksEarly(_ weeks: Int?, calendar: Calendar = .current) {
        guard let birthDate else { return }
        dueDate = weeks.map { calendar.date(byAdding: .day, value: $0 * 7, to: calendar.startOfDay(for: birthDate))! }
    }
}

/// When the chat asks "Has your baby arrived?". Twins and triplets usually come earlier.
nonisolated enum BirthBanner {
    static func startWeek(multiples: Int) -> Int {
        switch multiples {
        case ...1: 37
        case 2: 34
        default: 32
        }
    }

    /// "Not yet" hides it for the rest of that day.
    static func isShown(stage: Child.Stage, multiples: Int, progress: PregnancyProgress?, dismissedOn: Date?, on date: Date, calendar: Calendar = .current) -> Bool {
        guard stage == .expecting, let progress, progress.weeks >= startWeek(multiples: multiples) else { return false }
        guard let dismissedOn else { return true }
        return !calendar.isDate(dismissedOn, inSameDayAs: date)
    }
}

extension BirthBanner {
    static func isShown(for child: Child, dismissedOn: Date?, on date: Date = .now, calendar: Calendar = .current) -> Bool {
        isShown(
            stage: child.stage,
            multiples: child.multiples,
            progress: child.pregnancy(on: date, calendar: calendar),
            dismissedOn: dismissedOn,
            on: date,
            calendar: calendar
        )
    }
}

extension MomProfile {
    /// Ends a pregnancy. Its history is kept; deleting it is a separate action.
    /// If the chat was about it, the chat moves to the newest remaining child.
    func archive(_ pregnancy: Child, in context: ModelContext) throws {
        precondition(pregnancy.stage == .expecting, "only a pregnancy can be archived")
        pregnancy.stage = .archived
        if activeChild === pregnancy {
            activeChild = try newestChild(in: context)
        }
    }

    func restore(_ pregnancy: Child, in context: ModelContext) throws {
        precondition(pregnancy.stage == .archived, "only an archived pregnancy can be restored")
        pregnancy.stage = .expecting
        if activeChild == nil {
            activeChild = pregnancy
        }
    }

    /// Deletes an archived pregnancy with its conversations and notes.
    func delete(_ archived: Child, in context: ModelContext) throws {
        precondition(archived.stage == .archived, "only an archived pregnancy can be deleted")
        if activeChild === archived {
            activeChild = nil
        }
        context.delete(archived)
    }

    /// The newest child or pregnancy that isn't archived.
    func newestChild(in context: ModelContext) throws -> Child? {
        // Enums can't be compared inside `#Predicate`, so filter after fetching. There are only a handful.
        let descriptor = FetchDescriptor<Child>(sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
        return try context.fetch(descriptor).first { $0.stage != .archived }
    }
}
