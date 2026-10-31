import SwiftData
import SwiftUI

/// "Welcome, little one": switches a pregnancy to born. One block per baby for twins and more.
/// Only the birth date is needed; everything else can be filled in later from the profile.
struct BirthFormView: View {
    let pregnancy: Child

    @State private var draft: BirthDraft
    @State private var saveError: String?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    init(pregnancy: Child) {
        self.pregnancy = pregnancy
        _draft = State(initialValue: BirthDraft(pregnancy: pregnancy))
    }

    private var isMultiple: Bool { draft.babies.count > 1 }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(isMultiple ? .birthFormIntroMultiples : .birthFormIntro)
                        .font(Typography.body)
                        .foregroundStyle(Palette.textPrimary)
                }

                Section {
                    DatePicker(selection: $draft.birthDate, in: draft.birthDateRange, displayedComponents: .date) {
                        Text(.birthFormBirthDate)
                    }
                    Picker(selection: $draft.deliveryType) {
                        Text(.birthFormDeliveryNotSaying).tag(Child.Delivery?.none)
                        Text(.birthFormDeliveryVaginal).tag(Child.Delivery?.some(.vaginal))
                        Text(.birthFormDeliveryCesarean).tag(Child.Delivery?.some(.cesarean))
                    } label: {
                        Text(.birthFormDelivery)
                    }
                } footer: {
                    Text(.birthFormDateFooter)
                }

                ForEach($draft.babies) { $baby in
                    Section {
                        TextField(String(localized: .birthFormName), text: $baby.name)
                            .textContentType(.givenName)
                        Picker(selection: $baby.sex) {
                            Text(.birthFormSexNotSaying).tag(Child.Sex?.none)
                            Text(.birthFormSexGirl).tag(Child.Sex?.some(.girl))
                            Text(.birthFormSexBoy).tag(Child.Sex?.some(.boy))
                        } label: {
                            Text(.birthFormSex)
                        }
                        Picker(selection: $baby.feeding) {
                            Text(.birthFormFeedingNotSaying).tag(Child.Feeding?.none)
                            Text(.birthFormFeedingBreast).tag(Child.Feeding?.some(.breast))
                            Text(.birthFormFeedingFormula).tag(Child.Feeding?.some(.formula))
                            Text(.birthFormFeedingMixed).tag(Child.Feeding?.some(.mixed))
                        } label: {
                            Text(.birthFormFeeding)
                        }
                    } header: {
                        if isMultiple, let index = draft.babies.firstIndex(where: { $0.id == baby.id }) {
                            Text(.birthFormBabyNumber(index + 1))
                        } else {
                            Text(.birthFormBabyHeader)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle(Text(isMultiple ? .birthFormTitleMultiples : .birthFormTitle))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(.commonCancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(.birthFormSave, action: save)
                        .disabled(!draft.isValid)
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

    private func save() {
        draft.record(into: pregnancy, in: context)
        do {
            try context.save()
            dismiss()
        } catch {
            context.rollback()
            saveError = error.localizedDescription
        }
    }
}

#Preview("Twins") {
    BirthFormView(pregnancy: Child(stage: .expecting, dueDate: .now.addingTimeInterval(14 * 86_400), multiples: 2))
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
