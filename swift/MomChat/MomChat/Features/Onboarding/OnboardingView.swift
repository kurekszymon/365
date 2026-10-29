import SwiftData
import SwiftUI

/// Welcome → device check → "Where are you right now?" → details → paywall → chat.
/// Nothing is saved until the last step, so quitting halfway starts over cleanly.
struct OnboardingView: View {
    let availability: ModelAvailability

    enum Step: Hashable {
        case deviceCheck, path, pregnancy, birth, paywall
    }

    @Environment(\.modelContext) private var context
    @State private var draft = OnboardingDraft()
    @State private var steps: [Step] = []
    @State private var saveError: String?

    var body: some View {
        NavigationStack(path: $steps) {
            WelcomeStep {
                steps.append(availability.isReady ? .path : .deviceCheck)
            }
            .navigationDestination(for: Step.self) { step in
                switch step {
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
                case .paywall:
                    // Never reached on a phone that can't run the model: the device check has no way forward.
                    PaywallPlaceholderStep(onContinue: finish)
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
        .alert("Couldn't save your profile", isPresented: Binding(get: { saveError != nil }, set: { if !$0 { saveError = nil } })) {
            Button("OK") {}
        } message: {
            Text(verbatim: saveError ?? "")
        }
    }

    /// The steps after choosing a path. "Both" asks about the baby first, then the pregnancy.
    /// Stage 11 adds the optional FaceID lock between the details and the paywall.
    private var sequence: [Step] {
        var steps = [Step.path]
        if draft.path?.includesBirth == true { steps.append(.birth) }
        if draft.path?.includesPregnancy == true { steps.append(.pregnancy) }
        steps.append(.paywall)
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
        } catch {
            context.rollback()
            saveError = error.localizedDescription
        }
    }
}

// MARK: - Steps

struct WelcomeStep: View {
    let onStart: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            Spacer()
            Text("Welcome to MomChat")
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text("Answers for you and your baby, private on your phone.")
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            VStack(alignment: .leading, spacing: Spacing.l) {
                promise("lock.shield", "Your questions never leave this phone.")
                promise("apple.intelligence", "Answers are written right on your iPhone by Apple Intelligence.")
                promise("person.crop.circle.badge.xmark", "No account and no sign-up.")
            }
            Spacer()
            PrimaryButton("Get started", action: onStart)
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
                Text("Where are you right now?")
                    .font(Typography.largeTitle)
                    .foregroundStyle(Palette.textPrimary)
                    .padding(.bottom, Spacing.s)
                card(.expecting, title: "I'm expecting", detail: "Pregnant with one baby or more")
                card(.born, title: "My baby is here", detail: "A newborn, baby or toddler up to 3")
                card(.both, title: "Both", detail: "Pregnant, with a little one already at home")
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

/// Stands in for the real paywall (Stage 10).
struct PaywallPlaceholderStep: View {
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: Spacing.l) {
            Spacer()
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(Palette.accent)
            Text("You're all set")
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text("Plans and the free trial will appear here.")
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            PrimaryButton("Continue", action: onContinue)
        }
        .multilineTextAlignment(.center)
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
    }
}

/// The bottom button on the form steps.
struct ContinueBar: View {
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        PrimaryButton("Continue", action: action)
            .disabled(!isEnabled)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.m)
            .background(Palette.background)
    }
}

#Preview {
    OnboardingView(availability: ModelAvailability())
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
