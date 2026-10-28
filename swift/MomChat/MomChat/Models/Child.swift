import Foundation
import SwiftData

/// One baby, from pregnancy to age 3. Week and age are always calculated, never stored.
@Model final class Child {
    nonisolated enum Stage: String, Codable, Sendable {
        case expecting, born, archived
    }

    nonisolated enum Sex: String, Codable, Sendable {
        case girl, boy
    }

    nonisolated enum Delivery: String, Codable, Sendable {
        case vaginal, cesarean
    }

    nonisolated enum Feeding: String, Codable, Sendable {
        case breast, formula, mixed, solidsAndMilk
    }

    /// `nil` = "Baby": many parents haven't chosen a name yet.
    var name: String?
    var stage: Stage
    /// Required while expecting. Kept after birth for corrected age.
    var dueDate: Date?
    /// Date and time of birth, set when the baby arrives.
    var birthDate: Date?
    /// Babies in this pregnancy or birth: 1 = singleton, 2 = twins… Kept on each baby after birth.
    var multiples: Int = 1
    /// Shared by twins/triplets born together, so each can find the others. `nil` for a singleton.
    var multipleBirthID: UUID?
    /// `nil` = unknown or not telling.
    var sex: Sex?
    var pregnancyConditions: [String] = []
    var deliveryType: Delivery?
    var feeding: Feeding?
    var allergies: [String] = []
    var conditions: [String] = []
    var medications: [String] = []
    @Relationship(deleteRule: .cascade, inverse: \ProfileNote.child)
    var notes: [ProfileNote] = []
    @Relationship(deleteRule: .cascade, inverse: \Conversation.child)
    var conversations: [Conversation] = []
    var createdAt: Date

    init(name: String? = nil, stage: Stage, dueDate: Date? = nil, birthDate: Date? = nil, multiples: Int = 1, createdAt: Date = .now) {
        self.name = name
        self.multiples = max(multiples, 1)
        self.stage = stage
        self.dueDate = dueDate
        self.birthDate = birthDate
        self.createdAt = createdAt
    }
}

extension Child {
    /// Only while expecting. An archived pregnancy stops counting weeks.
    func pregnancy(on date: Date = .now, calendar: Calendar = .current) -> PregnancyProgress? {
        guard stage == .expecting, let dueDate else { return nil }
        return PregnancyDates.progress(dueDate: dueDate, on: date, calendar: calendar)
    }

    func age(on date: Date = .now, calendar: Calendar = .current) -> ChildAge? {
        guard stage == .born, let birthDate else { return nil }
        return ChildAge.between(birthDate, and: date, calendar: calendar)
    }

    func correctedAge(on date: Date = .now, calendar: Calendar = .current) -> CorrectedAge? {
        guard stage == .born, let birthDate, let dueDate else { return nil }
        return CorrectedAge.between(birthDate: birthDate, dueDate: dueDate, and: date, calendar: calendar)
    }
}
