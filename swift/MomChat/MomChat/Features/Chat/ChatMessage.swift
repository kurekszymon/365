import Foundation

struct ChatMessage: Identifiable {
    enum Role {
        case user
        case assistant
    }

    enum Content {
        case localized(LocalizedStringResource)
        case verbatim(String)
    }

    let id = UUID()
    let role: Role
    let content: Content
}
