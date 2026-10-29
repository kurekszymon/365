import SwiftUI

struct ChatView: View {
    /// `nil` only in previews or if the profile was deleted underneath.
    let child: Child?

    // Not saved yet, and no answers: the model is wired up in Stage 6.
    @State private var messages: [ChatMessage] = []
    @State private var draft = ""
    @State private var isShowingSettings = false

    var body: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.m) {
                Text("MomChat gives information, not medical advice.")
                    .font(Typography.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, Spacing.s)
                ForEach(messages) { message in
                    MessageBubble(message: message)
                }
            }
            .padding(Spacing.l)
        }
        .defaultScrollAnchor(.bottom)
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.background)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: Spacing.s) {
                chipRow
                inputBar
            }
            .padding(.bottom, Spacing.s)
            .background(Palette.background)
        }
        .navigationTitle(Text(verbatim: header.title))
        .navigationSubtitle(Text(verbatim: header.subtitle ?? ""))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Settings", systemImage: "gearshape") {
                    isShowingSettings = true
                }
            }
        }
        .sheet(isPresented: $isShowingSettings) {
            SettingsView()
        }
    }

    private var header: ChatHeader {
        ChatHeader(child: child)
    }

    /// Placeholders until Stage 6 picks starter chips for the exact stage.
    private var chips: [LocalizedStringResource] {
        if child?.stage == .born {
            ["Sleep", "Feeding", "Crying", "Poop"]
        } else {
            ["Back pain", "Sleep positions", "Baby kicks", "What to eat"]
        }
    }

    private var chipRow: some View {
        ScrollView(.horizontal) {
            HStack(spacing: Spacing.s) {
                ForEach(chips, id: \.key) { chip in
                    Button {
                        draft = String(localized: chip)
                    } label: {
                        Text(chip)
                            .font(Typography.chip)
                            .foregroundStyle(Palette.onChip)
                            .padding(.horizontal, Spacing.m)
                            .padding(.vertical, Spacing.s)
                            .background(Palette.chip, in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, Spacing.l)
        }
        .scrollIndicators(.hidden)
    }

    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: Spacing.s) {
            TextField("Ask anything…", text: $draft, axis: .vertical)
                .font(Typography.body)
                .foregroundStyle(Palette.textPrimary)
                .lineLimit(1...5)
                .padding(.horizontal, Spacing.l)
                .padding(.vertical, Spacing.m)
                .background(Palette.surface, in: .rect(cornerRadius: Radius.field, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.field, style: .continuous)
                        .strokeBorder(Palette.separator)
                )

            Button(action: send) {
                Image(systemName: "arrow.up")
                    .font(.headline)
                    .foregroundStyle(Palette.onAccent)
                    .frame(width: 44, height: 44)
                    .background(Palette.accent, in: .circle)
            }
            .accessibilityLabel(Text("Send"))
            .disabled(trimmedDraft.isEmpty)
            .opacity(trimmedDraft.isEmpty ? 0.4 : 1)
        }
        .padding(.horizontal, Spacing.l)
    }

    private var trimmedDraft: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func send() {
        guard !trimmedDraft.isEmpty else { return }
        messages.append(ChatMessage(role: .user, content: .verbatim(trimmedDraft)))
        draft = ""
    }
}

#Preview("Pregnant") {
    NavigationStack {
        ChatView(child: Child(stage: .expecting, dueDate: .now.addingTimeInterval(109 * 86_400)))
    }
}

#Preview("Born") {
    NavigationStack {
        ChatView(child: Child(name: "Emma", stage: .born, birthDate: .now.addingTimeInterval(-213 * 86_400)))
    }
}
