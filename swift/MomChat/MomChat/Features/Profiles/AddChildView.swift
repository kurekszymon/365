import SwiftData
import SwiftUI

/// Adds a new pregnancy or a baby who's already here, reusing the onboarding forms.
/// The chat moves to the new profile.
struct AddChildView: View {
    var onAdded: () -> Void = {}

    @Query private var moms: [MomProfile]
    @State private var draft: OnboardingDraft = {
        var draft = OnboardingDraft()
        draft.isAddingToProfile = true
        return draft
    }()
    @State private var steps: [OnboardingDraft.Path] = []
    @State private var saveError: String?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack(path: $steps) {
            List {
                choice(.expecting, title: .addChildPregnancyTitle, detail: .addChildPregnancyDetail, symbol: "figure.and.child.holdinghands")
                choice(.born, title: .addChildBornTitle, detail: .addChildBornDetail, symbol: "stroller")
            }
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle(Text(.addChildTitle))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(.commonCancel) { dismiss() }
                }
            }
            .navigationDestination(for: OnboardingDraft.Path.self) { path in
                switch path {
                case .born:
                    BirthDetailsStep(draft: $draft, continueTitle: .addChildSave, onContinue: save)
                default:
                    PregnancyDetailsStep(draft: $draft, continueTitle: .addChildSave, onContinue: save)
                }
            }
            .alert(Text(.profileSaveErrorTitle), isPresented: Binding(get: { saveError != nil }, set: { if !$0 { saveError = nil } })) {
                Button(.commonOk) {}
            } message: {
                Text(verbatim: saveError ?? "")
            }
        }
        .tint(Palette.accent)
    }

    private func choice(_ path: OnboardingDraft.Path, title: LocalizedStringResource, detail: LocalizedStringResource, symbol: String) -> some View {
        Button {
            draft.path = path
            steps = [path]
        } label: {
            Label {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .foregroundStyle(Palette.textPrimary)
                    Text(detail)
                        .font(Typography.caption)
                        .foregroundStyle(Palette.textSecondary)
                }
            } icon: {
                Image(systemName: symbol)
                    .foregroundStyle(Palette.accent)
            }
        }
    }

    private func save() {
        guard let mom = moms.first else { return }
        draft.addChildren(to: mom, in: context)
        do {
            try context.save()
            dismiss()
            onAdded()
        } catch {
            context.rollback()
            saveError = error.localizedDescription
        }
    }
}

#Preview {
    AddChildView()
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
