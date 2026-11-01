import SwiftData
import SwiftUI

struct ChatView: View {
    /// `nil` only in previews or if the profile was deleted underneath.
    let child: Child?

    @State private var chat: ChatController?
    @State private var draft = ""
    @State private var isShowingSettings = false
    @State private var isShowingProfiles = false
    @State private var isShowingHistory = false
    @State private var isRecordingBirth = false
    /// The day "Not yet" was tapped on the birth banner, as seconds since 1970. 0 = never.
    @AppStorage("birthBanner.dismissedOn") private var bannerDismissedOn: Double = 0
    @Environment(\.modelContext) private var context

    var body: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.m) {
                Text(.chatDisclaimer)
                    .font(Typography.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, Spacing.s)
                ForEach(chat?.messages ?? []) { message in
                    MessageBubble(role: message.role, text: message.text)
                }
                if let streaming = chat?.streamingText {
                    if streaming.isEmpty {
                        MessageBubble(isUser: false) { WritingIndicator() }
                    } else {
                        MessageBubble(role: .assistant, text: streaming)
                    }
                }
                if let failure = chat?.failure {
                    FailureBubble(failure: failure) {
                        chat?.retry()
                    } onNewChat: {
                        startNewChat()
                    }
                }
            }
            .padding(Spacing.l)
        }
        .defaultScrollAnchor(.bottom)
        .defaultScrollAnchor(.bottom, for: .sizeChanges)
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.background)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: Spacing.s) {
                if isShowingStarters { chipRow }
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
            ToolbarItem(placement: .topBarLeading) {
                Button(.chatToolbarHistory, systemImage: "list.bullet") {
                    isShowingHistory = true
                }
                .disabled(child == nil)
            }
            ToolbarItem(placement: .principal) {
                titleButton
            }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button(.chatToolbarNewChat, systemImage: "square.and.pencil", action: startNewChat)
                    .disabled(chat?.conversation == nil)
                Button(.settingsTitle, systemImage: "gearshape") {
                    isShowingSettings = true
                }
            }
        }
        .onChange(of: child?.persistentModelID, initial: true) {
            openChat(resuming: true)
        }
        // A birth changes the whole profile: the model needs the new one, the chat stays.
        .onChange(of: child?.stage) {
            chat?.profileDidChange()
        }
        .sheet(isPresented: $isShowingSettings) {
            SettingsView()
        }
        .sheet(isPresented: $isShowingProfiles, onDismiss: { chat?.profileDidChange() }) {
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
        .sheet(isPresented: $isShowingHistory) {
            if let child {
                NavigationStack {
                    ConversationListView(child: child, current: chat?.conversation) { conversation in
                        open(conversation)
                    } onDeleteCurrent: {
                        openChat(resuming: false)
                    }
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button(.commonDone) { isShowingHistory = false }
                        }
                    }
                }
                .tint(Palette.accent)
            }
        }
        .sheet(isPresented: $isRecordingBirth) {
            if let child {
                BirthFormView(pregnancy: child)
            }
        }
    }

    // MARK: Chat

    /// Resuming reopens the latest chat if it's recent; otherwise a fresh, unsaved one.
    private func openChat(resuming: Bool) {
        let recent = resuming ? child.flatMap { try? $0.history(in: context) }.flatMap { ConversationResume.conversation(from: $0) } : nil
        open(recent)
    }

    private func open(_ conversation: Conversation?) {
        chat?.close()
        draft = ""
        guard let child else {
            chat = nil
            return
        }
        let controller = ChatController(child: child, conversation: conversation, context: context)
        controller.prewarm()
        chat = controller
    }

    private func startNewChat() {
        open(nil)
    }

    private var isShowingStarters: Bool {
        guard let chat else { return false }
        return chat.messages.isEmpty && !chat.isResponding && !starters.isEmpty
    }

    private var starters: [StarterChip] {
        StarterChip.chips(for: child)
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

    private var chipRow: some View {
        ScrollView(.horizontal) {
            HStack(spacing: Spacing.s) {
                ForEach(starters) { chip in
                    Button {
                        draft = String(localized: chip.question)
                    } label: {
                        Text(chip.label)
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

            if chat?.isResponding == true {
                Button {
                    chat?.stop()
                } label: {
                    Image(systemName: "stop.fill")
                        .font(.headline)
                        .foregroundStyle(Palette.onAccent)
                        .frame(width: 44, height: 44)
                        .background(Palette.accent, in: .circle)
                }
                .accessibilityLabel(Text(.chatInputStop))
            } else {
                Button(action: send) {
                    Image(systemName: "arrow.up")
                        .font(.headline)
                        .foregroundStyle(Palette.onAccent)
                        .frame(width: 44, height: 44)
                        .background(Palette.accent, in: .circle)
                }
                .accessibilityLabel(Text(.chatInputSend))
                .disabled(!canSend)
                .opacity(canSend ? 1 : 0.4)
            }
        }
        .padding(.horizontal, Spacing.l)
    }

    private var trimmedDraft: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canSend: Bool {
        chat != nil && !trimmedDraft.isEmpty
    }

    private func send() {
        guard canSend else { return }
        chat?.send(trimmedDraft)
        draft = ""
    }
}

#Preview("Pregnant") {
    NavigationStack {
        ChatView(child: Child(stage: .expecting, dueDate: .now.addingTimeInterval(109 * 86_400)))
    }
    .modelContainer(try! DataStore.makeInMemoryContainer())
}

#Preview("Born") {
    NavigationStack {
        ChatView(child: Child(name: "Emma", stage: .born, birthDate: .now.addingTimeInterval(-213 * 86_400)))
    }
    .modelContainer(try! DataStore.makeInMemoryContainer())
}
