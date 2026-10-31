import SwiftUI

struct ChatView: View {
    /// `nil` only in previews or if the profile was deleted underneath.
    let child: Child?

    // Not saved yet, and no answers: the model is wired up in Stage 6.
    @State private var messages: [ChatMessage] = []
    @State private var draft = ""
    @State private var isShowingSettings = false
    @State private var isShowingProfiles = false
    @State private var isRecordingBirth = false
    /// The day "Not yet" was tapped on the birth banner, as seconds since 1970. 0 = never.
    @AppStorage("birthBanner.dismissedOn") private var bannerDismissedOn: Double = 0

    var body: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.m) {
                Text(.chatDisclaimer)
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
        .safeAreaInset(edge: .top, spacing: 0) {
            if let child, isShowingBirthBanner {
                BirthBannerView(multiples: child.multiples) {
                    isRecordingBirth = true
                } onNotYet: {
                    withAnimation { bannerDismissedOn = Date.now.timeIntervalSince1970 }
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                titleButton
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(.settingsTitle, systemImage: "gearshape") {
                    isShowingSettings = true
                }
            }
        }
        .sheet(isPresented: $isShowingSettings) {
            SettingsView()
        }
        .sheet(isPresented: $isShowingProfiles) {
            NavigationStack {
                ProfilesView(dismissesOnSelect: true)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button(.commonDone) { isShowingProfiles = false }
                        }
                    }
            }
            .tint(Palette.accent)
        }
        .sheet(isPresented: $isRecordingBirth) {
            if let child {
                BirthFormView(pregnancy: child)
            }
        }
    }

    private var header: ChatHeader {
        ChatHeader(child: child)
    }

    private var isShowingBirthBanner: Bool {
        guard let child else { return false }
        let dismissedOn = bannerDismissedOn > 0 ? Date(timeIntervalSince1970: bannerDismissedOn) : nil
        return BirthBanner.isShown(for: child, dismissedOn: dismissedOn)
    }

    /// The chat title doubles as the way to switch profiles.
    private var titleButton: some View {
        Button {
            isShowingProfiles = true
        } label: {
            VStack(spacing: 0) {
                HStack(spacing: Spacing.xs) {
                    Text(verbatim: header.title)
                        .font(.headline)
                    Image(systemName: "chevron.down")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Palette.textSecondary)
                }
                if let subtitle = header.subtitle {
                    Text(verbatim: subtitle)
                        .font(Typography.caption)
                        .foregroundStyle(Palette.textSecondary)
                }
            }
            .foregroundStyle(Palette.textPrimary)
        }
        .buttonStyle(.plain)
        .accessibilityHint(Text(.chatHeaderOpenProfiles))
    }

    /// Placeholders until Stage 6 picks starter chips for the exact stage.
    private var chips: [LocalizedStringResource] {
        if child?.stage == .born {
            [.chatChipSleep, .chatChipFeeding, .chatChipCrying, .chatChipPoop]
        } else {
            [.chatChipBackPain, .chatChipSleepPositions, .chatChipBabyKicks, .chatChipWhatToEat]
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
            TextField(String(localized: .chatInputPlaceholder), text: $draft, axis: .vertical)
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
            .accessibilityLabel(Text(.chatInputSend))
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
