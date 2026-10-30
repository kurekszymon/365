import SwiftUI

struct PregnancyDetailsStep: View {
    @Binding var draft: OnboardingDraft
    let onContinue: () -> Void

    var body: some View {
        Form {
            Section {
                Picker(selection: $draft.pregnancy.source) {
                    Text(.onboardingPregnancyDueDate).tag(OnboardingDraft.DueDateSource.dueDate)
                    Text(.onboardingPregnancyLastPeriodSegment).tag(OnboardingDraft.DueDateSource.lastPeriod)
                } label: {
                    Text(.onboardingPregnancyCountFrom)
                }
                .pickerStyle(.segmented)
                switch draft.pregnancy.source {
                case .dueDate:
                    DatePicker(selection: $draft.pregnancy.dueDate, in: draft.dueDateRange, displayedComponents: .date) {
                        Text(.onboardingPregnancyDueDate)
                    }
                case .lastPeriod:
                    DatePicker(selection: $draft.pregnancy.lastPeriod, in: draft.lastPeriodRange, displayedComponents: .date) {
                        Text(.onboardingPregnancyLastPeriodDate)
                    }
                }
            } header: {
                Text(.onboardingPregnancyDueHeader)
            } footer: {
                if draft.pregnancy.source == .lastPeriod {
                    Text(.onboardingPregnancyCalculatedDueDate(draft.resolvedDueDate.formatted(date: .long, time: .omitted)))
                }
            }

            Section {
                Stepper(value: $draft.pregnancy.babies, in: 1...Int.max) {
                    Text(.onboardingBabiesCount(draft.pregnancy.babies))
                }
            } footer: {
                if draft.pregnancy.babies > 1 {
                    Text(.onboardingPregnancyMultiplesFooter)
                }
            }

            if draft.path == .expecting {
                Section {
                    Picker(selection: $draft.pregnancy.isFirstPregnancy) {
                        Text(.onboardingPregnancyFirstPregnancySkip).tag(Bool?.none)
                        Text(.onboardingPregnancyFirstPregnancyYes).tag(Bool?.some(true))
                        Text(.onboardingPregnancyFirstPregnancyNo).tag(Bool?.some(false))
                    } label: {
                        Text(.onboardingPregnancyFirstPregnancy)
                    }
                }
            }

            if draft.pregnancy.babies == 1 {
                Section {
                    TextField(String(localized: .onboardingPregnancyName), text: $draft.pregnancy.name)
                        .textContentType(.givenName)
                    Picker(selection: $draft.pregnancy.sex) {
                        Text(.onboardingPregnancySexUnknown).tag(Child.Sex?.none)
                        Text(.onboardingSexGirl).tag(Child.Sex?.some(.girl))
                        Text(.onboardingSexBoy).tag(Child.Sex?.some(.boy))
                    } label: {
                        Text(.onboardingSex)
                    }
                } header: {
                    Text(.onboardingPregnancyBabyHeader)
                }
            }

            Section {
                TextField(String(localized: .onboardingPregnancyDoctorPlaceholder), text: $draft.pregnancy.doctorNotes, axis: .vertical)
                    .lineLimit(1...4)
            } header: {
                Text(.onboardingPregnancyDoctorHeader)
            } footer: {
                Text(.onboardingPregnancyDoctorFooter)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle(Text(.onboardingPregnancyTitle))
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
