import SwiftData
import SwiftUI

/// Facts saved from chats, newest first. Editable; swipe to delete. Hidden when there are none.
struct ProfileNotesSection: View {
    let notes: [ProfileNote]

    @Environment(\.modelContext) private var context

    private var sorted: [ProfileNote] {
        notes.filter { !$0.isDeleted }.sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        if !sorted.isEmpty {
            Section {
                ForEach(sorted) { note in
                    ProfileNoteRow(note: note)
                }
                .onDelete { offsets in
                    let shown = sorted
                    offsets.forEach { context.delete(shown[$0]) }
                    try? context.save()
                }
            } header: {
                Text(.profileNotesHeader)
            } footer: {
                Text(.profileNotesFooter(ProfileBlock.noteLimit))
            }
        }
    }
}

private struct ProfileNoteRow: View {
    @Bindable var note: ProfileNote

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            TextField(String(localized: .profileNotesField), text: $note.text, axis: .vertical)
            Text(note.createdAt, format: .dateTime.day().month().year())
                .font(Typography.caption)
                .foregroundStyle(Palette.textSecondary)
        }
    }
}
