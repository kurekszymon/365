#if DEBUG
import SwiftUI

/// UserDefaults keys for developer settings that reach outside the Developer screen.
enum DebugKeys {
    /// Shows `TokenOverlay` over the chat.
    static let tokenOverlay = "debug.tokenOverlay"
    /// Pretend the model's context is this many tokens (0 = the real size), to see compaction early.
    static let contextSizeOverride = "debug.contextSizeOverride"
}

/// Context use for the open chat, measured before each question. Tap to expand.
struct TokenOverlay: View {
    let chat: ChatController

    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(verbatim: headline)
                .fontWeight(.semibold)
            if isExpanded {
                if let usage = chat.usage {
                    Text(verbatim: "instructions \(usage.instructions) (summary ≈\(usage.summary))")
                    Text(verbatim: "history \(usage.history) · \(usage.turns) turns")
                    Text(verbatim: "question \(usage.question)")
                    Text(verbatim: "limit \(usage.promptLimit) + answer \(usage.contextSize - usage.promptLimit)")
                    Text(verbatim: usage.isExact ? "exact counts" : "estimated (iOS < 26.4)")
                }
                if let tokens = chat.transcriptTokens {
                    Text(verbatim: "session after answer \(tokens)")
                }
                Text(verbatim: "summarized msgs \(chat.conversation?.summarizedMessageCount ?? 0)")
                Text(verbatim: "compactions \(chat.compactions) · overflow retries \(chat.overflowRetries)")
                if let event = chat.lastEvent {
                    Text(verbatim: event)
                        .foregroundStyle(.yellow)
                }
                if let summary = chat.conversation?.summary {
                    Text(verbatim: summary)
                        .frame(maxWidth: 260, alignment: .leading)
                        .padding(.top, 4)
                }
            }
        }
        .font(.caption2.monospaced())
        .foregroundStyle(.white)
        .multilineTextAlignment(.trailing)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(.black.opacity(0.75), in: .rect(cornerRadius: 8))
        .onTapGesture { withAnimation(.snappy) { isExpanded.toggle() } }
    }

    private var headline: String {
        guard let usage = chat.usage else { return "ctx – / \(chat.budget.contextSize)" }
        let marker = usage.isExact ? "" : "≈"
        let summary = chat.conversation?.summary == nil ? "" : " · S"
        return "ctx \(marker)\(usage.total + (usage.contextSize - usage.promptLimit)) / \(usage.contextSize)\(summary) · C\(chat.compactions)"
    }
}
#endif
