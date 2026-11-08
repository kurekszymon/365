import SwiftUI

struct MessageBubble<Content: View>: View {
    let isUser: Bool
    @ViewBuilder let content: Content

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: Spacing.xxl * 2) }
            content
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
}

extension MessageBubble where Content == MessageText {
    init(role: Message.Role, text: String) {
        self.init(isUser: role == .user) {
            MessageText(text: text, rendersMarkdown: role == .assistant)
        }
    }
}

/// The model writes light Markdown (**bold**, "- " bullets). Bold is rendered; line breaks stay as written.
struct MessageText: View {
    let text: String
    let rendersMarkdown: Bool

    var body: some View {
        Text(attributed)
            .textSelection(.enabled)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var attributed: AttributedString {
        guard rendersMarkdown,
              let parsed = try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))
        else { return AttributedString(text) }
        return parsed
    }
}

/// Under an answer the model marked as medical.
struct MedicalFootnote: View {
    var body: some View {
        Text(.chatMedicalFootnote)
            .font(Typography.caption)
            .foregroundStyle(Palette.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Spacing.l)
    }
}

/// Three dots until the first word arrives.
struct WritingIndicator: View {
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: Spacing.xs) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Palette.textSecondary)
                    .frame(width: 7, height: 7)
                    .opacity(isAnimating ? 1 : 0.3)
                    .animation(.easeInOut(duration: 0.6).repeatForever().delay(Double(index) * 0.2), value: isAnimating)
            }
        }
        .padding(.vertical, Spacing.xs)
        .onAppear { isAnimating = true }
        .accessibilityElement()
        .accessibilityLabel(Text(.chatWriting))
    }
}

/// A friendly message where an answer would be, with a way forward when there is one.
struct FailureBubble: View {
    let failure: ChatFailure
    /// `nil` for a failure further up a reopened chat: only the latest question can be retried.
    var onRetry: (() -> Void)? = nil

    var body: some View {
        MessageBubble(isUser: false) {
            VStack(alignment: .leading, spacing: Spacing.s) {
                Text(message)
                    .foregroundStyle(Palette.textSecondary)
                if failure.canRetry, let onRetry {
                    Button(.chatFailureRetry, action: onRetry)
                        .font(Typography.chip)
                        .tint(Palette.accent)
                }
            }
        }
    }

    private var message: LocalizedStringResource {
        switch failure {
        case .declined: .chatFailureDeclined
        case .unsupportedLanguage: .chatFailureUnsupportedLanguage
        case .tooLong: .chatFailureTooLong
        case .modelUnavailable: .chatFailureModelUnavailable
        case .retryable: .chatFailureRetryable
        }
    }
}
