import SwiftUI

struct PregnancyDetailsStep: View {
    @Binding var draft: OnboardingDraft
    let onContinue: () -> Void

    var body: some View {
        Form {
            Section {
                Picker("Count from", selection: $draft.pregnancy.source) {
                    Text("Due date").tag(OnboardingDraft.DueDateSource.dueDate)
                    Text("Last period").tag(OnboardingDraft.DueDateSource.lastPeriod)
                }
                .pickerStyle(.segmented)
                switch draft.pregnancy.source {
                case .dueDate:
                    DatePicker("Due date", selection: $draft.pregnancy.dueDate, in: draft.dueDateRange, displayedComponents: .date)
                case .lastPeriod:
                    DatePicker("First day of last period", selection: $draft.pregnancy.lastPeriod, in: draft.lastPeriodRange, displayedComponents: .date)
                }
            } header: {
                Text("When is the baby due?")
            } footer: {
                if draft.pregnancy.source == .lastPeriod {
                    Text("Due date: \(draft.resolvedDueDate.formatted(date: .long, time: .omitted))")
                }
            }

            Section {
                Stepper("Babies: \(draft.pregnancy.babies)", value: $draft.pregnancy.babies, in: 1...Int.max)
            } footer: {
                if draft.pregnancy.babies > 1 {
                    Text("You'll add a name for each baby when they arrive.")
                }
            }

            if draft.path == .expecting {
                Section {
                    Picker("First pregnancy?", selection: $draft.pregnancy.isFirstPregnancy) {
                        Text("Skip").tag(Bool?.none)
                        Text("Yes").tag(Bool?.some(true))
                        Text("No").tag(Bool?.some(false))
                    }
                }
            }

            if draft.pregnancy.babies == 1 {
                Section {
                    TextField("Name, if you've picked one", text: $draft.pregnancy.name)
                        .textContentType(.givenName)
                    Picker("Sex", selection: $draft.pregnancy.sex) {
                        Text("Don't know yet").tag(Child.Sex?.none)
                        Text("Girl").tag(Child.Sex?.some(.girl))
                        Text("Boy").tag(Child.Sex?.some(.boy))
                    }
                } header: {
                    Text("Baby (optional)")
                }
            }

            Section {
                TextField("e.g. low iron, placenta position", text: $draft.pregnancy.doctorNotes, axis: .vertical)
                    .lineLimit(1...4)
            } header: {
                Text("Anything your doctor is watching?")
            } footer: {
                Text("Optional. Separate things with commas.")
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle("Your pregnancy")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            ContinueBar(isEnabled: draft.isPregnancyValid, action: onContinue)
        }
    }
}

#Preview {
    @Previewable @State var draft: OnboardingDraft = {
        var draft = OnboardingDraft()
        draft.path = .expecting
        return draft
    }()
    NavigationStack {
        PregnancyDetailsStep(draft: $draft) {}
    }
}
