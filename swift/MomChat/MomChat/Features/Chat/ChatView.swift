import SwiftData
import SwiftUI

struct ChatView: View {
    /// `nil` only in previews or if the profile was deleted underneath.
    let child: Child?

    @State private var chat: ChatController?
    @State private var draft = ""
    /// The chat that went quiet when the app started a fresh one on its own. Shown as a notice
    /// with a way back until she sends something or opens another chat.
    @State private var freshStartFrom: Conversation?
    @State private var isShowingSettings = false
    @State private var isShowingProfiles = false
    @State private var isShowingHistory = false
    @State private var isRecordingBirth = false
    @State private var isAddingChild = false
    @State private var isShowingPaywall = false
    @Environment(QuestionAccess.self) private var access
    /// The day "Not yet" was tapped on the birth banner, as seconds since 1970. 0 = never.
    @AppStorage(BirthBanner.dismissedOnKey) private var bannerDismissedOn: Double = 0
    @Environment(\.modelContext) private var context
    @Environment(\.scenePhase) private var scenePhase
    #if DEBUG
    @AppStorage(DebugKeys.tokenOverlay) private var showsTokenOverlay = false
    #endif

    var body: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.m) {
                Text(.chatDisclaimer)
                    .font(Typography.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, Spacing.s)
                if let previous = freshStartFrom, chat?.messages.isEmpty == true {
                    freshStartNotice(previous)
                }
                ForEach(chat?.messages ?? []) { message in
                    MessageBubble(role: message.role, text: message.text)
                    if message.showsDisclaimer {
                        MedicalFootnote()
                    }
                    if let topic = message.emergency {
                        EmergencyNotice { chat?.presentedEmergency = topic }
                    }
                    if let support = message.support {
                        SupportCard(topic: support)
                    }
                    noteCard(for: message)
                    // Earlier unanswered questions. The last one is `chat.failure` below, with Try again.
                    if let saved = message.failure, message !== chat?.messages.last {
                        FailureBubble(failure: saved)
                    }
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
            if child != nil {
                VStack(spacing: Spacing.s) {
                    if isShowingStarters { chipRow }
                    allowanceLine
                    inputBar
                }
                .padding(.bottom, Spacing.s)
                .background(Palette.background)
            }
        }
        // No profile to talk about, e.g. right after archiving her only pregnancy.
        .overlay {
            if child == nil { noProfileState }
        }
        #if DEBUG
        .overlay(alignment: .topTrailing) {
            if showsTokenOverlay, let chat {
                TokenOverlay(chat: chat)
                    .padding(Spacing.s)
            }
        }
        #endif
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
            ToolbarItem(placement: .topBarLeading) {
                ConversationShareButton(conversation: chat?.conversation)
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
        // The 6-hour rule also applies when the app comes back from the background (left open
        // overnight), unless an answer is still coming or she's mid-sentence.
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active, let chat, !chat.isResponding,
                  draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let stale = chat.conversation, ConversationResume.isStale(stale) else { return }
            startNewChat()
            freshStartFrom = stale
        }
        // A birth changes the whole profile: the model needs the new one, the chat stays.
        .onChange(of: child?.stage) {
            chat?.profileDidChange()
        }
        // Profiles can be edited from Settings too, so the model needs the fresh profile either way.
        .sheet(isPresented: $isShowingSettings, onDismiss: { chat?.profileDidChange() }) {
            SettingsView()
        }
        .fullScreenCover(item: presentedEmergency) { topic in
            EmergencyCardView(
                topic: topic,
                onAskAnyway: chat?.canAskAnyway == true ? { chat?.askAnyway() } : nil,
                onClose: { chat?.presentedEmergency = nil }
            )
        }
        .sheet(isPresented: $isAddingChild) {
            AddChildView()
        }
        .onChange(of: chat?.isPaywallDue) { _, isDue in
            guard isDue == true else { return }
            chat?.isPaywallDue = false
            if access.isLocked { isShowingPaywall = true }
        }
        .sheet(isPresented: $isShowingPaywall) {
            PaywallView()
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

    private var presentedEmergency: Binding<EmergencyTopic?> {
        Binding(get: { chat?.presentedEmergency }, set: { chat?.presentedEmergency = $0 })
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
        freshStartFrom = nil
        guard let child else {
            chat = nil
            return
        }
        let controller = ChatController(child: child, conversation: conversation, context: context, access: access)
        controller.prewarm()
        chat = controller
    }

    private func startNewChat() {
        open(nil)
    }

    private func freshStartNotice(_ previous: Conversation) -> some View {
        VStack(spacing: Spacing.s) {
            Text(.chatFreshStartNotice)
                .font(Typography.caption)
                .foregroundStyle(Palette.textSecondary)
                .multilineTextAlignment(.center)
            Button(.chatFreshStartBack) {
                open(previous)
            }
            .font(Typography.chip)
            .tint(Palette.accent)
        }
        .padding(Spacing.m)
        .frame(maxWidth: .infinity)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: Radius.bubble))
    }

    @ViewBuilder
    private func noteCard(for message: Message) -> some View {
        if let child, child.stage != .archived, let proposal = message.noteProposal {
            switch message.noteProposalState {
            case .pending:
                ProfileNoteCard(proposal: proposal, child: child) {
                    chat?.saveProposal(on: message)
                } onDismiss: {
                    chat?.dismissProposal(on: message)
                }
            case .saved:
                ProfileNoteSavedLine()
            case .dismissed, nil:
                EmptyView()
            }
        }
    }

    private var noProfileState: some View {
        ContentUnavailableView {
            Label(.chatNoProfileTitle, systemImage: "heart")
        } description: {
            Text(.chatNoProfileDetail)
        } actions: {
            Button(.profilesAdd) { isAddingChild = true }
                .buttonStyle(.borderedProminent)
                .tint(Palette.accent)
        }
        .background(Palette.background)
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

    /// Nothing until 5 are left. The field stays usable when locked, because the emergency gate
    /// has to keep working.
    @ViewBuilder
    private var allowanceLine: some View {
        if access.isLocked, chat?.isResponding != true {
            allowanceButton(.chatFreeQuestionsUsedUp)
        } else if let remaining = access.remainingToShow {
            allowanceButton(.chatFreeQuestionsLeft(remaining))
        }
    }

    private func allowanceButton(_ text: LocalizedStringResource) -> some View {
        Button {
            isShowingPaywall = true
        } label: {
            Text(text)
                .font(Typography.caption)
                .foregroundStyle(Palette.textSecondary)
                .multilineTextAlignment(.center)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, Spacing.l)
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
        if chat?.send(trimmedDraft) == .locked {
            // Her words stay in the field for after she's picked a plan.
            isShowingPaywall = true
        } else {
            draft = ""
        }
    }
}

#Preview("Pregnant") {
    NavigationStack {
        ChatView(child: Child(stage: .expecting, dueDate: .now.addingTimeInterval(109 * 86_400)))
    }
    .environment(QuestionAccess())
    .environment(AppLock())
    .modelContainer(try! DataStore.makeInMemoryContainer())
}

#Preview("No profile") {
    NavigationStack {
        ChatView(child: nil)
    }
    .environment(QuestionAccess())
    .environment(AppLock())
    .modelContainer(try! DataStore.makeInMemoryContainer())
}

#Preview("Born") {
    NavigationStack {
        ChatView(child: Child(name: "Emma", stage: .born, birthDate: .now.addingTimeInterval(-213 * 86_400)))
    }
    .environment(QuestionAccess())
    .environment(AppLock())
    .modelContainer(try! DataStore.makeInMemoryContainer())
}
