import Foundation
import SwiftData

/// Everything she has, as plain values: the mom, every child and pregnancy (archived ones too),
/// notes, chats and messages. Not included: the lock setting, the free-question count (per phone)
/// and purchases (her Apple Account restores those).
///
/// New model fields go in as optionals, so an older backup still opens in a newer app.
nonisolated struct BackupArchive: Codable, Sendable, Equatable {
    static let currentFormat = 1

    var format = currentFormat
    var createdAt: Date
    var mom: Mom?
    var children: [ChildRecord]
    var conversations: [ConversationRecord]

    struct Note: Codable, Sendable, Equatable {
        var text: String
        var createdAt: Date
    }

    struct Mom: Codable, Sendable, Equatable {
        var name: String?
        var previousBirths: Int?
        var conditions: [String]
        var medications: [String]
        var notes: [Note]
        var activeChildID: UUID?
        var createdAt: Date
    }

    struct ChildRecord: Codable, Sendable, Equatable {
        var id: UUID
        var name: String?
        var stage: Child.Stage
        var dueDate: Date?
        var birthDate: Date?
        var multiples: Int
        var multipleBirthID: UUID?
        var sex: Child.Sex?
        var pregnancyConditions: [String]
        var deliveryType: Child.Delivery?
        var feeding: Child.Feeding?
        var allergies: [String]
        var conditions: [String]
        var medications: [String]
        var notes: [Note]
        var createdAt: Date
    }

    struct ConversationRecord: Codable, Sendable, Equatable {
        var childID: UUID?
        var title: String?
        var summary: String?
        var summarizedMessageCount: Int
        var createdAt: Date
        var updatedAt: Date
        var messages: [MessageRecord]
    }

    struct MessageRecord: Codable, Sendable, Equatable {
        var role: Message.Role
        var text: String
        var failureReason: String?
        var emergencyTopic: String?
        var supportTopic: String?
        var showsDisclaimer: Bool
        var proposedNote: String?
        var proposedNoteSubject: String?
        var proposedNoteState: String?
        var createdAt: Date
    }
}

// MARK: - From and to SwiftData

extension BackupArchive {
    init(from context: ModelContext, now: Date = .now) throws {
        let children = try context.fetch(FetchDescriptor<Child>(sortBy: [SortDescriptor(\.createdAt)]))
        let ids = Dictionary(uniqueKeysWithValues: children.map { ($0.persistentModelID, UUID()) })
        let id = { (child: Child?) in child.flatMap { ids[$0.persistentModelID] } }

        let moms = try context.fetch(FetchDescriptor<MomProfile>(sortBy: [SortDescriptor(\.createdAt)]))
        let conversations = try context.fetch(FetchDescriptor<Conversation>(sortBy: [SortDescriptor(\.createdAt)]))

        self.init(
            createdAt: now,
            mom: moms.first.map { mom in
                Mom(
                    name: mom.name,
                    previousBirths: mom.previousBirths,
                    conditions: mom.conditions,
                    medications: mom.medications,
                    notes: Self.records(mom.notes),
                    activeChildID: id(mom.activeChild),
                    createdAt: mom.createdAt
                )
            },
            children: children.map { child in
                ChildRecord(
                    id: id(child)!,
                    name: child.name,
                    stage: child.stage,
                    dueDate: child.dueDate,
                    birthDate: child.birthDate,
                    multiples: child.multiples,
                    multipleBirthID: child.multipleBirthID,
                    sex: child.sex,
                    pregnancyConditions: child.pregnancyConditions,
                    deliveryType: child.deliveryType,
                    feeding: child.feeding,
                    allergies: child.allergies,
                    conditions: child.conditions,
                    medications: child.medications,
                    notes: Self.records(child.notes),
                    createdAt: child.createdAt
                )
            },
            conversations: conversations.map { conversation in
                ConversationRecord(
                    childID: id(conversation.child),
                    title: conversation.title,
                    summary: conversation.summary,
                    summarizedMessageCount: conversation.summarizedMessageCount,
                    createdAt: conversation.createdAt,
                    updatedAt: conversation.updatedAt,
                    messages: conversation.sortedMessages.map { message in
                        MessageRecord(
                            role: message.role,
                            text: message.text,
                            failureReason: message.failureReason,
                            emergencyTopic: message.emergencyTopic,
                            supportTopic: message.supportTopic,
                            showsDisclaimer: message.showsDisclaimer,
                            proposedNote: message.proposedNote,
                            proposedNoteSubject: message.proposedNoteSubject,
                            proposedNoteState: message.proposedNoteStateRaw,
                            createdAt: message.createdAt
                        )
                    }
                )
            }
        )
    }

    /// Replaces everything in `context` with this archive, in one save. On failure nothing changes.
    func restore(into context: ModelContext) throws {
        do {
            try DataWipe.deleteRecords(in: context)
            insert(into: context)
            try context.save()
        } catch {
            context.rollback()
            throw error
        }
    }

    private func insert(into context: ModelContext) {
        var children: [UUID: Child] = [:]
        for record in self.children {
            let child = Child(
                name: record.name,
                stage: record.stage,
                dueDate: record.dueDate,
                birthDate: record.birthDate,
                multiples: record.multiples,
                createdAt: record.createdAt
            )
            child.multipleBirthID = record.multipleBirthID
            child.sex = record.sex
            child.pregnancyConditions = record.pregnancyConditions
            child.deliveryType = record.deliveryType
            child.feeding = record.feeding
            child.allergies = record.allergies
            child.conditions = record.conditions
            child.medications = record.medications
            context.insert(child)
            for note in record.notes {
                let saved = ProfileNote(text: note.text, createdAt: note.createdAt)
                context.insert(saved)
                saved.child = child
            }
            children[record.id] = child
        }

        if let record = mom {
            let mom = MomProfile(name: record.name, previousBirths: record.previousBirths, createdAt: record.createdAt)
            mom.conditions = record.conditions
            mom.medications = record.medications
            context.insert(mom)
            for note in record.notes {
                let saved = ProfileNote(text: note.text, createdAt: note.createdAt)
                context.insert(saved)
                saved.mom = mom
            }
            mom.activeChild = record.activeChildID.flatMap { children[$0] }
        }

        for record in conversations {
            let conversation = Conversation(child: nil, createdAt: record.createdAt)
            context.insert(conversation)
            conversation.child = record.childID.flatMap { children[$0] }
            conversation.title = record.title
            conversation.summary = record.summary
            conversation.summarizedMessageCount = record.summarizedMessageCount
            for item in record.messages {
                let message = Message(role: item.role, text: item.text, createdAt: item.createdAt)
                message.failureReason = item.failureReason
                message.emergencyTopic = item.emergencyTopic
                message.supportTopic = item.supportTopic
                message.showsDisclaimer = item.showsDisclaimer
                message.proposedNote = item.proposedNote
                message.proposedNoteSubject = item.proposedNoteSubject
                message.proposedNoteStateRaw = item.proposedNoteState
                context.insert(message)
                message.conversation = conversation
            }
            // Set last: adding messages doesn't touch it, but keep the original order of the chats list.
            conversation.updatedAt = record.updatedAt
        }
    }

    private static func records(_ notes: [ProfileNote]) -> [Note] {
        notes.sorted { $0.createdAt < $1.createdAt }.map { Note(text: $0.text, createdAt: $0.createdAt) }
    }
}

// MARK: - Bytes

nonisolated extension BackupArchive {
    enum DecodeFailure: Error {
        case newerFormat
    }

    /// JSON with exact dates (seconds as a Double, so message order survives), then LZFSE.
    func encoded() throws -> Data {
        let json = try JSONEncoder().encode(self)
        return try (json as NSData).compressed(using: .lzfse) as Data
    }

    static func decoded(from data: Data) throws -> BackupArchive {
        let json = try (data as NSData).decompressed(using: .lzfse) as Data
        struct Header: Decodable { var format: Int }
        guard try JSONDecoder().decode(Header.self, from: json).format <= currentFormat else {
            throw DecodeFailure.newerFormat
        }
        return try JSONDecoder().decode(BackupArchive.self, from: json)
    }
}
