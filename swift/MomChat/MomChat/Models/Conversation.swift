import Foundation
import SwiftData

/// A chat thread. Each one belongs to one child or pregnancy.
@Model final class Conversation {
    var child: Child?
    @Relationship(deleteRule: .cascade, inverse: \Message.conversation)
    var messages: [Message] = []
    var title: String?
    var createdAt: Date
    var updatedAt: Date

    init(child: Child?, createdAt: Date = .now) {
        self.child = child
        self.createdAt = createdAt
        self.updatedAt = createdAt
    }

    /// SwiftData relationships are unordered.
    var sortedMessages: [Message] {
        messages.sorted { $0.createdAt < $1.createdAt }
    }
}

@Model final class Message {
    nonisolated enum Role: String, Codable, Sendable {
        case user, assistant
    }

    var conversation: Conversation?
    var role: Role
    var text: String
    var createdAt: Date

    init(role: Role, text: String, createdAt: Date = .now) {
        self.role = role
        self.text = text
        self.createdAt = createdAt
    }
}
