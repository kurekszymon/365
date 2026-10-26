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

extension ChatMessage {
    // Static demo conversation until the model is wired up (Stage 6).
    static let samples: [ChatMessage] = [
        ChatMessage(role: .user, content: .localized("My back hurts a lot at night. Is that normal at 24 weeks?")),
        ChatMessage(role: .assistant, content: .localized("Yes, it's very common around now. Your bump is growing and your posture is shifting. Try sleeping on your side with a pillow between your knees.")),
        ChatMessage(role: .user, content: .localized("What if it gets worse?")),
        ChatMessage(role: .assistant, content: .localized("If the pain is sharp, comes in waves, or you also have bleeding, call your midwife. Otherwise, gentle stretching and a warm (not hot) shower can help.")),
    ]
}
