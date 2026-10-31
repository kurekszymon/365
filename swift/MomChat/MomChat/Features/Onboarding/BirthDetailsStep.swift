import SwiftUI

struct BirthDetailsStep: View {
    @Binding var draft: OnboardingDraft
    var continueTitle: LocalizedStringResource = .onboardingContinue
    let onContinue: () -> Void

    private var babyCount: Binding<Int> {
        Binding(get: { draft.birth.babies.count }, set: { draft.setBabyCount($0) })
    }

    var body: some View {
        Form {
            Section {
                DatePicker(selection: $draft.birth.birthDate, in: draft.birthDateRange, displayedComponents: .date) {
                    Text(.onboardingBirthBirthDate)
                }
                Stepper(value: babyCount, in: 1...Int.max) {
                    Text(.onboardingBabiesCount(draft.birth.babies.count))
                }
            } footer: {
                Text(.onboardingBirthBabiesFooter)
            }

            ForEach($draft.birth.babies) { $baby in
                Section {
                    TextField(String(localized: .onboardingBirthName), text: $baby.name)
                        .textContentType(.givenName)
                    Picker(selection: $baby.sex) {
                        Text(.onboardingBirthSexNotSaying).tag(Child.Sex?.none)
                        Text(.onboardingSexGirl).tag(Child.Sex?.some(.girl))
                        Text(.onboardingSexBoy).tag(Child.Sex?.some(.boy))
                    } label: {
                        Text(.onboardingSex)
                    }
                    TextField(String(localized: .onboardingBirthAllergies), text: $baby.allergies)
                    TextField(String(localized: .onboardingBirthConditions), text: $baby.conditions)
                } header: {
                    if draft.birth.babies.count > 1, let index = draft.birth.babies.firstIndex(where: { $0.id == baby.id }) {
                        Text(.onboardingBirthBabyNumber(index + 1))
                    } else {
                        Text(.onboardingBirthSingleBabyHeader)
                    }
                }
            }

            Section {
                Toggle(isOn: $draft.birth.bornEarly.animation()) {
                    Text(.onboardingBirthBornEarly)
                }
                if draft.birth.bornEarly {
                    Stepper(value: $draft.birth.weeksEarly, in: OnboardingDraft.weeksEarlyRange) {
                        Text(.onboardingBirthWeeksEarly(draft.birth.weeksEarly))
                    }
                }
                Picker(selection: $draft.birth.deliveryType) {
                    Text(.onboardingBirthDeliveryNotSaying).tag(Child.Delivery?.none)
                    Text(.onboardingBirthDeliveryVaginal).tag(Child.Delivery?.some(.vaginal))
                    Text(.onboardingBirthDeliveryCesarean).tag(Child.Delivery?.some(.cesarean))
                } label: {
                    Text(.onboardingBirthDelivery)
                }
                Picker(selection: $draft.birth.feeding) {
                    Text(.onboardingBirthFeedingNotSaying).tag(Child.Feeding?.none)
                    Text(.onboardingBirthFeedingBreast).tag(Child.Feeding?.some(.breast))
                    Text(.onboardingBirthFeedingFormula).tag(Child.Feeding?.some(.formula))
                    Text(.onboardingBirthFeedingMixed).tag(Child.Feeding?.some(.mixed))
                    Text(.onboardingBirthFeedingSolidsAndMilk).tag(Child.Feeding?.some(.solidsAndMilk))
                } label: {
                    Text(.onboardingBirthFeeding)
                }
            } header: {
                Text(.onboardingBirthBirthHeader)
            } footer: {
                if draft.birth.bornEarly {
                    Text(.onboardingBirthBornEarlyFooter)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle(Text(.onboardingBirthTitle))
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            ContinueBar(title: continueTitle, isEnabled: draft.isBirthValid, action: onContinue)
        }
    }
}

#Preview {
    @Previewable @State var draft: OnboardingDraft = {
        var draft = OnboardingDraft()
        draft.path = .born
        return draft
    }()
    NavigationStack {
        BirthDetailsStep(draft: $draft) {}
    }
}
