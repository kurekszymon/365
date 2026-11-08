import SwiftUI

/// Under an answer: asks whether to keep a fact from the chat. Nothing is saved without the tap.
struct ProfileNoteCard: View {
    let proposal: ProfileProposal
    let child: Child
    let onSave: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s) {
            Text(title)
                .font(Typography.caption)
                .foregroundStyle(Palette.textSecondary)
            Text(verbatim: proposal.fact)
                .font(Typography.body)
                .foregroundStyle(Palette.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: Spacing.l) {
                Button(.chatMemorySave, action: onSave)
                    .fontWeight(.semibold)
                Button(.chatMemoryDismiss, action: onDismiss)
            }
            .font(Typography.chip)
            .tint(Palette.accent)
            .buttonStyle(.borderless)
        }
        .padding(Spacing.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: Radius.bubble))
    }

    private var title: LocalizedStringResource {
        switch (proposal.subject, child.stage) {
        case (.mom, _): .chatMemoryTitleMom
        case (.child, .born): .chatMemoryTitleChild(child.name ?? String(localized: .childDefaultName))
        case (.child, _): .chatMemoryTitlePregnancy
        }
    }
}

/// Replaces the card once she has tapped Save.
struct ProfileNoteSavedLine: View {
    var body: some View {
        Label {
            Text(.chatMemorySaved)
        } icon: {
            Image(systemName: "checkmark")
        }
        .font(Typography.caption)
        .foregroundStyle(Palette.textSecondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Spacing.l)
    }
}
