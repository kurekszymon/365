import SwiftUI

struct MessageBubble: View {
    let message: ChatMessage

    private var isUser: Bool { message.role == .user }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: Spacing.xxl * 2) }
            text
                .font(Typography.body)
                .foregroundStyle(Palette.textPrimary)
                .padding(.horizontal, Spacing.l)
                .padding(.vertical, Spacing.m)
                .background(
                    isUser ? Palette.bubbleUser : Palette.bubbleAssistant,
                    in: .rect(cornerRadius: Radius.bubble, style: .continuous)
                )
            if !isUser { Spacer(minLength: Spacing.xxl) }
        }
    }

    private var text: Text {
        switch message.content {
        case .localized(let resource): Text(resource)
        case .verbatim(let string): Text(verbatim: string)
        }
    }
}
