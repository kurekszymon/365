import Foundation
import SwiftData

/// What the birth form collects for each baby.
nonisolated struct Newborn: Sendable {
    var name: String?
    var sex: Child.Sex?
    var feeding: Child.Feeding?
}

extension Child {
    /// Turns an expecting profile into one born child per baby.
    /// The first baby keeps this record, so the pregnancy conversations and notes stay with it.
    /// The others are new records sharing the due date, birth, delivery and pregnancy conditions.
    /// Fewer babies than expected is allowed.
    @discardableResult
    func recordBirth(at birthDate: Date, deliveryType: Delivery?, babies: [Newborn], in context: ModelContext) -> [Child] {
        precondition(stage == .expecting, "only an expecting profile can be born")
        precondition(!babies.isEmpty, "at least one baby")

        let groupID = babies.count > 1 ? UUID() : nil
        let siblings = babies.dropFirst().map { _ in
            let sibling = Child(stage: .born, dueDate: dueDate)
            sibling.pregnancyConditions = pregnancyConditions
            context.insert(sibling)
            return sibling
        }
        let children = [self] + siblings

        for (child, baby) in zip(children, babies) {
            child.stage = .born
            child.birthDate = birthDate
            child.deliveryType = deliveryType
            child.multiples = babies.count
            child.multipleBirthID = groupID
            child.name = baby.name ?? (child === self ? name : nil)
            child.sex = baby.sex
            child.feeding = baby.feeding
        }
        return children
    }
}
