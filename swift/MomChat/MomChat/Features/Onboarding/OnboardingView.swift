import SwiftData
import SwiftUI

/// Welcome → device check → "Where are you right now?" → details → app lock → free questions → chat.
/// The welcome screen also offers restoring a backup, for a new phone.
/// There's no payment step: the paywall comes after the free questions (Stage 10).
/// Nothing is saved until the last step, so quitting halfway starts over cleanly.
struct OnboardingView: View {
    let availability: ModelAvailability

    enum Step: Hashable {
        case restore, deviceCheck, path, pregnancy, birth, lock, freeQuestions
    }

    @Environment(\.modelContext) private var context
    @Environment(AppLock.self) private var lock
    @State private var draft = OnboardingDraft()
    /// Confirmed with Face ID on the lock step, turned on only once the profile is saved.
    @State private var turnsOnLock = false
    @State private var steps: [Step] = []
    @State private var saveError: String?

    var body: some View {
        NavigationStack(path: $steps) {
            WelcomeStep {
                steps.append(availability.isReady ? .path : .deviceCheck)
            } onRestore: {
                steps.append(.restore)
            }
            .navigationDestination(for: Step.self) { step in
                switch step {
                case .restore:
                    BackupImportView(replacesExisting: false)
                case .deviceCheck:
                    DeviceCheckView(availability: availability)
                case .path:
                    PathStep { path in
                        draft.path = path
                        advance(from: .path)
                    }
                case .pregnancy:
                    PregnancyDetailsStep(draft: $draft) { advance(from: .pregnancy) }
                case .birth:
                    BirthDetailsStep(draft: $draft) { advance(from: .birth) }
                case .lock:
                    LockStep { turnOn in
                        turnsOnLock = turnOn
                        advance(from: .lock)
                    }
                case .freeQuestions:
                    // Never reached on a phone that can't run the model: the device check has no way forward.
                    FreeQuestionsStep(onStart: finish)
                }
            }
        }
        .tint(Palette.accent)
        // The model finished downloading or was turned on while the check was showing.
        .onChange(of: availability.isReady) { _, isReady in
            if isReady, steps.last == .deviceCheck {
                steps[steps.count - 1] = .path
            }
        }
        .alert(Text(.onboardingSaveErrorTitle), isPresented: Binding(get: { saveError != nil }, set: { if !$0 { saveError = nil } })) {
            Button(.commonOk) {}
        } message: {
            Text(verbatim: saveError ?? "")
        }
    }

    /// The steps after choosing a path. "Both" asks about the baby first, then the pregnancy.
    /// The lock step is skipped on a phone with no passcode, where no lock is possible.
    private var sequence: [Step] {
        var steps = [Step.path]
        if draft.path?.includesBirth == true { steps.append(.birth) }
        if draft.path?.includesPregnancy == true { steps.append(.pregnancy) }
        if lock.method != nil { steps.append(.lock) }
        steps.append(.freeQuestions)
        return steps
    }

    private func advance(from step: Step) {
        guard let index = sequence.firstIndex(of: step), index + 1 < sequence.count else { return }
        steps.append(sequence[index + 1])
    }

    private func finish() {
        draft.save(in: context)
        do {
            try context.save()
            if turnsOnLock { lock.setEnabled(true) }
        } catch {
            context.rollback()
            saveError = error.localizedDescription
        }
    }
}

// MARK: - Steps

struct WelcomeStep: View {
    let onStart: () -> Void
    let onRestore: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            Spacer()
            Text(.onboardingWelcomeTitle)
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text(.onboardingWelcomeSubtitle)
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            VStack(alignment: .leading, spacing: Spacing.l) {
                promise("lock.shield", .onboardingWelcomePromisePrivate)
                promise("apple.intelligence", .onboardingWelcomePromiseOnDevice)
                promise("person.crop.circle.badge.xmark", .onboardingWelcomePromiseNoAccount)
            }
            Spacer()
            VStack(spacing: Spacing.m) {
                PrimaryButton(.onboardingWelcomeStart, action: onStart)
                Button(.onboardingWelcomeRestore, action: onRestore)
                    .font(Typography.body)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
        .toolbarVisibility(.hidden, for: .navigationBar)
    }

    private func promise(_ symbol: String, _ text: LocalizedStringResource) -> some View {
        Label {
            Text(text)
                .font(Typography.body)
                .foregroundStyle(Palette.textPrimary)
        } icon: {
            Image(systemName: symbol)
                .foregroundStyle(Palette.accent)
                .frame(width: 28)
        }
    }
}

struct PathStep: View {
    let onChoose: (OnboardingDraft.Path) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.m) {
                Text(.onboardingPathTitle)
                    .font(Typography.largeTitle)
                    .foregroundStyle(Palette.textPrimary)
                    .padding(.bottom, Spacing.s)
                card(.expecting, title: .onboardingPathExpectingTitle, detail: .onboardingPathExpectingDetail)
                card(.born, title: .onboardingPathBornTitle, detail: .onboardingPathBornDetail)
                card(.both, title: .onboardingPathBothTitle, detail: .onboardingPathBothDetail)
            }
            .padding(Spacing.xl)
        }
        .background(Palette.background)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func card(_ path: OnboardingDraft.Path, title: LocalizedStringResource, detail: LocalizedStringResource) -> some View {
        Button {
            onChoose(path)
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(Palette.textPrimary)
                    Text(detail)
                        .font(Typography.caption)
                        .foregroundStyle(Palette.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(Palette.textSecondary)
            }
            .padding(Spacing.l)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: Radius.bubble, style: .continuous))
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }
}

/// Optional: ask for Face ID (or the passcode) each time the app opens.
struct LockStep: View {
    let onDone: (_ turnOn: Bool) -> Void

    @Environment(AppLock.self) private var lock

    var body: some View {
        VStack(spacing: Spacing.l) {
            Spacer()
            Image(systemName: lock.method == .faceID ? "faceid" : "lock")
                .font(.system(size: 48))
                .foregroundStyle(Palette.accent)
                .accessibilityHidden(true)
            Text(.onboardingLockTitle)
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text(.onboardingLockSubtitle)
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            VStack(spacing: Spacing.m) {
                PrimaryButton(lock.method == .faceID ? .onboardingLockTurnOnFaceID : .onboardingLockTurnOnPasscode) {
                    // If she cancels Face ID she stays here and can choose again.
                    Task {
                        if await lock.confirmOwner() { onDone(true) }
                    }
                }
                .disabled(lock.isAuthenticating)
                Button(.onboardingLockNotNow) { onDone(false) }
                    .font(Typography.body)
                    .frame(maxWidth: .infinity)
            }
            Text(.onboardingLockFootnote)
                .font(Typography.caption)
                .foregroundStyle(Palette.textSecondary)
        }
        .multilineTextAlignment(.center)
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
    }
}

/// The last onboarding step. Nothing to buy here: she starts asking right away.
struct FreeQuestionsStep: View {
    let onStart: () -> Void

    @Environment(QuestionAccess.self) private var access

    /// The Keychain counter survives a reinstall, so she may not have the full allowance.
    private var hasFreeQuestions: Bool {
        !access.entitlements.isEntitled && !access.free.isUsedUp
    }

    private var title: LocalizedStringResource {
        if access.entitlements.isEntitled { return .onboardingFreeQuestionsFullAccessTitle }
        return access.free.isUsedUp ? .onboardingFreeQuestionsUsedUpTitle : .onboardingFreeQuestionsTitle(access.free.remaining)
    }

    private var subtitle: LocalizedStringResource {
        if access.entitlements.isEntitled { return .onboardingFreeQuestionsFullAccessSubtitle }
        return access.free.isUsedUp ? .onboardingFreeQuestionsUsedUpSubtitle : .onboardingFreeQuestionsSubtitle
    }

    var body: some View {
        VStack(spacing: Spacing.l) {
            Spacer()
            Image(systemName: "gift")
                .font(.system(size: 48))
                .foregroundStyle(Palette.accent)
            Text(title)
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text(subtitle)
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            if hasFreeQuestions {
                Text(.onboardingFreeQuestionsFootnote)
                    .font(Typography.caption)
                    .foregroundStyle(Palette.textSecondary)
            }
            PrimaryButton(access.free.isUsedUp && !access.entitlements.isEntitled ? .onboardingFreeQuestionsContinue : .onboardingFreeQuestionsStart, action: onStart)
        }
        .multilineTextAlignment(.center)
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
    }
}

/// The bottom button on the form steps.
struct ContinueBar: View {
    var title: LocalizedStringResource = .onboardingContinue
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        PrimaryButton(title, action: action)
            .disabled(!isEnabled)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.m)
            .background(Palette.background)
    }
}

#Preview {
    OnboardingView(availability: ModelAvailability())
        .environment(QuestionAccess())
        .environment(AppLock())
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
