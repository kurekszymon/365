import SwiftData
import SwiftUI

/// Edits a pregnancy, a born child or an archived pregnancy. Field changes save as she types;
/// the birth, ending, restoring and deleting are saved right away.
struct ChildEditView: View {
    @Bindable var child: Child

    @Query private var moms: [MomProfile]
    @State private var isRecordingBirth = false
    @State private var isConfirmingEnd = false
    @State private var isConfirmingDelete = false
    @State private var saveError: String?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            // A deleted record can't be read any more; the screen is on its way out.
            if child.isDeleted || child.modelContext == nil {
                EmptyView()
            } else {
                switch child.stage {
                case .expecting: pregnancySections
                case .born: bornSections
                case .archived: archivedSections
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle(Text(verbatim: child.modelContext == nil ? "" : ProfileSummary(child: child).title))
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isRecordingBirth) {
            BirthFormView(pregnancy: child)
        }
        .confirmationDialog(Text(.profileChildEndConfirmTitle), isPresented: $isConfirmingEnd, titleVisibility: .visible) {
            Button(.profileChildEndConfirmAction, role: .destructive) {
                perform { try $0.archive(child, in: context) }
            }
        } message: {
            Text(.profileChildEndConfirmMessage)
        }
        .confirmationDialog(Text(.profileChildDeleteConfirmTitle), isPresented: $isConfirmingDelete, titleVisibility: .visible) {
            Button(.profileChildDeleteConfirmAction, role: .destructive) {
                dismiss()
                perform { try $0.delete(child, in: context) }
            }
        } message: {
            Text(.profileChildDeleteConfirmMessage)
        }
        .alert(Text(.profileSaveErrorTitle), isPresented: Binding(get: { saveError != nil }, set: { if !$0 { saveError = nil } })) {
            Button(.commonOk) {}
        } message: {
            Text(verbatim: saveError ?? "")
        }
    }

    // MARK: Pregnancy

    @ViewBuilder
    private var pregnancySections: some View {
        // From 22w0d. A loss before that goes through "End this pregnancy", never a birth button.
        if (child.pregnancy()?.totalDays ?? 0) >= BirthDraft.earliestBirthDays {
            Section {
                Button {
                    isRecordingBirth = true
                } label: {
                    Label {
                        Text(child.multiples > 1 ? .profileChildBabiesArrived : .profileChildBabyArrived)
                    } icon: {
                        Image(systemName: "heart.fill")
                    }
                }
            }
        }

        Section {
            DatePicker(selection: dueDate, in: dueDateRange, displayedComponents: .date) {
                Text(.profileChildDueDate)
            }
            Stepper(value: $child.multiples, in: 1...Int.max) {
                Text(.profileChildBabiesCount(child.multiples))
            }
        }

        if child.multiples == 1 {
            Section {
                TextField(String(localized: .profileChildNameIfPicked), text: $child.name.orEmpty)
                    .textContentType(.givenName)
                sexPicker(unknown: .profileChildSexUnknown)
            }
        }

        Section {
            ListField(.profileChildPregnancyConditions, items: $child.pregnancyConditions)
        } header: {
            Text(.profileChildPregnancyConditionsHeader)
        } footer: {
            Text(.profileListFooter)
        }

        Section {
            Button(role: .destructive) {
                isConfirmingEnd = true
            } label: {
                Text(.profileChildEnd)
            }
        }
    }

    private var dueDate: Binding<Date> {
        Binding(get: { child.dueDate ?? .now }, set: { child.dueDate = Calendar.current.startOfDay(for: $0) })
    }

    /// Same window as onboarding (2 weeks overdue to 40 weeks ahead), stretched to include the saved date.
    private var dueDateRange: ClosedRange<Date> {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let earliest = calendar.date(byAdding: .day, value: -14, to: today)!
        let latest = calendar.date(byAdding: .day, value: PregnancyDates.termDays, to: today)!
        let saved = child.dueDate ?? today
        return min(earliest, saved)...max(latest, saved)
    }

    // MARK: Born

    @ViewBuilder
    private var bornSections: some View {
        Section {
            TextField(String(localized: .profileChildName), text: $child.name.orEmpty)
                .textContentType(.givenName)
            sexPicker(unknown: .profileChildSexNotSaying)
            Picker(selection: $child.feeding) {
                Text(.profileChildFeedingNotSaying).tag(Child.Feeding?.none)
                Text(.profileChildFeedingBreast).tag(Child.Feeding?.some(.breast))
                Text(.profileChildFeedingFormula).tag(Child.Feeding?.some(.formula))
                Text(.profileChildFeedingMixed).tag(Child.Feeding?.some(.mixed))
                Text(.profileChildFeedingSolidsAndMilk).tag(Child.Feeding?.some(.solidsAndMilk))
            } label: {
                Text(.profileChildFeeding)
            }
        }

        Section {
            DatePicker(selection: shared(\.birthDate, default: .now), in: birthDateRange, displayedComponents: .date) {
                Text(.profileChildBirthDate)
            }
            Toggle(isOn: bornEarly.animation()) {
                Text(.profileChildBornEarly)
            }
            if let weeks = child.weeksEarly() {
                // Stretched to include the saved value, so the label and the stepper never disagree.
                Stepper(value: weeksEarly, in: 1...max(OnboardingDraft.weeksEarlyRange.upperBound, weeks)) {
                    Text(.profileChildWeeksEarly(weeks))
                }
            }
            Picker(selection: shared(\.deliveryType)) {
                Text(.profileChildDeliveryNotSaying).tag(Child.Delivery?.none)
                Text(.profileChildDeliveryVaginal).tag(Child.Delivery?.some(.vaginal))
                Text(.profileChildDeliveryCesarean).tag(Child.Delivery?.some(.cesarean))
            } label: {
                Text(.profileChildDelivery)
            }
        } header: {
            Text(.profileChildBirthHeader)
        } footer: {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                if child.weeksEarly() != nil {
                    Text(.profileChildBornEarlyFooter)
                }
                if child.multipleBirthID != nil {
                    Text(.profileChildSharedBirthFooter)
                }
            }
        }

        Section {
            ListField(.profileChildAllergies, items: $child.allergies)
            ListField(.profileChildConditions, items: $child.conditions)
            ListField(.profileChildMedications, items: $child.medications)
        } header: {
            Text(.profileChildHealthHeader)
        } footer: {
            Text(.profileListFooter)
        }
    }

    private var birthDateRange: ClosedRange<Date> {
        let today = Calendar.current.startOfDay(for: .now)
        return Calendar.current.date(byAdding: .year, value: -3, to: today)!...Date.now
    }

    private var bornEarly: Binding<Bool> {
        Binding(
            get: { child.weeksEarly() != nil },
            set: { isEarly in updateBirthGroup { $0.setWeeksEarly(isEarly ? 4 : nil) } }
        )
    }

    private var weeksEarly: Binding<Int> {
        Binding(
            get: { child.weeksEarly() ?? 4 },
            set: { weeks in updateBirthGroup { $0.setWeeksEarly(weeks) } }
        )
    }

    /// A field every baby from the same birth shares, so editing it on one updates the twins too.
    private func shared<Value>(_ keyPath: ReferenceWritableKeyPath<Child, Value>) -> Binding<Value> {
        Binding(get: { child[keyPath: keyPath] }, set: { value in updateBirthGroup { $0[keyPath: keyPath] = value } })
    }

    private func shared(_ keyPath: ReferenceWritableKeyPath<Child, Date?>, default fallback: Date) -> Binding<Date> {
        Binding(get: { child[keyPath: keyPath] ?? fallback }, set: { value in updateBirthGroup { $0[keyPath: keyPath] = value } })
    }

    private func updateBirthGroup(_ change: (Child) -> Void) {
        let group = (try? child.birthGroup(in: context)) ?? [child]
        group.forEach(change)
    }

    // MARK: Archived

    @ViewBuilder
    private var archivedSections: some View {
        Section {
            LabeledContent {
                Text(child.dueDate ?? .now, format: .dateTime.day().month(.wide).year())
            } label: {
                Text(.profileChildDueDate)
            }
        } footer: {
            Text(.profileChildArchivedFooter)
        }

        Section {
            Button {
                perform { try $0.restore(child, in: context) }
            } label: {
                Text(.profileChildRestore)
            }
            Button(role: .destructive) {
                isConfirmingDelete = true
            } label: {
                Text(.profileChildDelete)
            }
        }
    }

    // MARK: Helpers

    private func sexPicker(unknown: LocalizedStringResource) -> some View {
        Picker(selection: $child.sex) {
            Text(unknown).tag(Child.Sex?.none)
            Text(.profileChildSexGirl).tag(Child.Sex?.some(.girl))
            Text(.profileChildSexBoy).tag(Child.Sex?.some(.boy))
        } label: {
            Text(.profileChildSex)
        }
    }

    /// Runs a profile action and saves it, or rolls it back and shows why.
    private func perform(_ action: (MomProfile) throws -> Void) {
        guard let mom = moms.first else { return }
        do {
            try action(mom)
            try context.save()
        } catch {
            context.rollback()
            saveError = error.localizedDescription
        }
    }
}

#Preview("Pregnancy") {
    NavigationStack {
        ChildEditView(child: Child(stage: .expecting, dueDate: .now.addingTimeInterval(20 * 86_400)))
    }
    .modelContainer(try! DataStore.makeInMemoryContainer())
}

#Preview("Born") {
    NavigationStack {
        ChildEditView(child: Child(name: "Emma", stage: .born, birthDate: .now.addingTimeInterval(-213 * 86_400)))
    }
    .modelContainer(try! DataStore.makeInMemoryContainer())
}
