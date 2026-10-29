import SwiftUI

struct BirthDetailsStep: View {
    @Binding var draft: OnboardingDraft
    let onContinue: () -> Void

    private var babyCount: Binding<Int> {
        Binding(get: { draft.birth.babies.count }, set: { draft.setBabyCount($0) })
    }

    var body: some View {
        Form {
            Section {
                DatePicker("Birth date", selection: $draft.birth.birthDate, in: draft.birthDateRange, displayedComponents: .date)
                Stepper("Babies: \(draft.birth.babies.count)", value: babyCount, in: 1...Int.max)
            } footer: {
                Text("Twins or more? Each baby gets their own profile.")
            }

            ForEach($draft.birth.babies) { $baby in
                Section {
                    TextField("Name", text: $baby.name)
                        .textContentType(.givenName)
                    Picker("Sex", selection: $baby.sex) {
                        Text("Not saying").tag(Child.Sex?.none)
                        Text("Girl").tag(Child.Sex?.some(.girl))
                        Text("Boy").tag(Child.Sex?.some(.boy))
                    }
                    TextField("Allergies (optional)", text: $baby.allergies)
                    TextField("Health conditions (optional)", text: $baby.conditions)
                } header: {
                    if draft.birth.babies.count > 1, let index = draft.birth.babies.firstIndex(where: { $0.id == baby.id }) {
                        Text("Baby \(index + 1)")
                    } else {
                        Text("Your baby")
                    }
                }
            }

            Section {
                Toggle("Born early", isOn: $draft.birth.bornEarly.animation())
                if draft.birth.bornEarly {
                    Stepper("Weeks early: \(draft.birth.weeksEarly)", value: $draft.birth.weeksEarly, in: OnboardingDraft.weeksEarlyRange)
                }
                Picker("Delivery", selection: $draft.birth.deliveryType) {
                    Text("Not saying").tag(Child.Delivery?.none)
                    Text("Vaginal birth").tag(Child.Delivery?.some(.vaginal))
                    Text("C-section").tag(Child.Delivery?.some(.cesarean))
                }
                Picker("Feeding", selection: $draft.birth.feeding) {
                    Text("Not saying").tag(Child.Feeding?.none)
                    Text("Breastfeeding").tag(Child.Feeding?.some(.breast))
                    Text("Formula").tag(Child.Feeding?.some(.formula))
                    Text("Breast milk and formula").tag(Child.Feeding?.some(.mixed))
                    Text("Solids and milk").tag(Child.Feeding?.some(.solidsAndMilk))
                }
            } header: {
                Text("The birth (optional)")
            } footer: {
                if draft.birth.bornEarly {
                    Text("Babies born 4 or more weeks early get a corrected age too.")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle("Your baby")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            ContinueBar(isEnabled: draft.isBirthValid, action: onContinue)
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
