import Foundation
import SwiftData

/// Builds the instructions for a chat about `child` from what's in the store.
enum SessionPrompt {
    static func instructions(for child: Child, in context: ModelContext, on date: Date = .now, calendar: Calendar = .current) -> String {
        Instructions.make(profileBlock: profileBlock(for: child, in: context, on: date, calendar: calendar), on: date, calendar: calendar)
    }

    static func profileBlock(for child: Child, in context: ModelContext, on date: Date = .now, calendar: Calendar = .current) -> String {
        let mom = (try? context.fetch(FetchDescriptor<MomProfile>()))?.first
        let group = (try? child.birthGroup(in: context)) ?? [child]
        let twins = group.filter { $0 !== child && $0.stage == .born }
        let all = (try? context.fetch(FetchDescriptor<Child>(sortBy: [SortDescriptor(\.createdAt)]))) ?? []
        let others = all.filter { other in
            other.stage != .archived && !group.contains { $0 === other }
        }
        return ProfileBlock.make(mom: mom, child: child, twins: twins, others: others, on: date, calendar: calendar)
    }
}
