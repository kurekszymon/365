import SwiftData
import SwiftUI

/// Past chats for one child or pregnancy (twins also see the shared pregnancy chats), with search.
struct ConversationListView: View {
    let child: Child
    /// The chat open behind this sheet, marked in the list.
    let current: Conversation?
    let onSelect: (Conversation) -> Void
    /// Called when the open chat is deleted, so the screen behind can reset.
    let onDeleteCurrent: () -> Void

    @State private var query = ""
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let history = (try? child.history(in: context)) ?? []
        let hits = ConversationSearch.search(query, in: history)

        List {
            ForEach(hits) { hit in
                Button {
                    onSelect(hit.conversation)
                    dismiss()
                } label: {
                    row(hit)
                }
                .swipeActions {
                    Button(.chatHistoryDelete, systemImage: "trash", role: .destructive) {
                        delete(hit.conversation)
                    }
                }
                .contextMenu {
                    ConversationShareButton(conversation: hit.conversation)
                }
            }
        }
        .overlay {
            if history.isEmpty {
                ContentUnavailableView {
                    Label(.chatHistoryEmptyTitle, systemImage: "bubble.left.and.bubble.right")
                } description: {
                    Text(.chatHistoryEmptyDetail)
                }
            } else if hits.isEmpty {
                ContentUnavailableView.search(text: query)
            }
        }
        .searchable(text: $query, prompt: Text(.chatHistorySearchPrompt))
        .navigationTitle(Text(.chatHistoryTitle))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func row(_ hit: ConversationSearch.Hit) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(alignment: .firstTextBaseline) {
                title(hit.conversation)
                    .font(.headline)
                    .foregroundStyle(Palette.textPrimary)
                    .lineLimit(2)
                Spacer()
                Text(hit.conversation.updatedAt, format: .relative(presentation: .named))
                    .font(Typography.caption)
                    .foregroundStyle(Palette.textSecondary)
            }
            if let snippet = hit.snippet {
                Text(verbatim: snippet)
                    .font(Typography.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, Spacing.xs)
        .contentShape(.rect)
        .listRowBackground(hit.conversation === current ? Palette.chip.opacity(0.35) : nil)
    }

    private func title(_ conversation: Conversation) -> Text {
        if let title = conversation.title, !title.isEmpty {
            Text(verbatim: title)
        } else {
            Text(.chatHistoryUntitled)
        }
    }

    private func delete(_ conversation: Conversation) {
        let wasCurrent = conversation === current
        context.delete(conversation)
        try? context.save()
        if wasCurrent { onDeleteCurrent() }
    }
}
