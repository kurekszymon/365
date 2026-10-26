import SwiftUI

enum Trimester {
    case first, second, third

    var title: LocalizedStringResource {
        switch self {
        case .first: "1st trimester"
        case .second: "2nd trimester"
        case .third: "3rd trimester"
        }
    }
}

struct ChatView: View {
    // Hardcoded stage until profiles exist (Stage 3–4).
    private let week = 24
    private let trimester = Trimester.second

    private let chips: [LocalizedStringResource] = [
        "Back pain",
        "Sleep positions",
        "Baby kicks",
        "What to eat",
    ]

    @State private var messages = ChatMessage.samples
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
        .navigationTitle(Text("Week \(week)"))
        .navigationSubtitle(Text(trimester.title))
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

#Preview {
    NavigationStack {
        ChatView()
    }
}
