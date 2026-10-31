import SwiftUI

/// Edits the mom's own details. Changes save as she types.
struct MomEditView: View {
    @Bindable var mom: MomProfile

    /// 0 = first-time mom. "No" keeps a higher count if there is one; onboarding only ever stores 1.
    private var isFirstTime: Binding<Bool?> {
        Binding(
            get: { mom.previousBirths.map { $0 == 0 } },
            set: { isFirst in
                switch isFirst {
                case true?: mom.previousBirths = 0
                case false?: mom.previousBirths = max(mom.previousBirths ?? 1, 1)
                case nil: mom.previousBirths = nil
                }
            }
        )
    }

    var body: some View {
        Form {
            Section {
                TextField(String(localized: .profileMomName), text: $mom.name.orEmpty)
                    .textContentType(.givenName)
                Picker(selection: isFirstTime) {
                    Text(.profileMomFirstTimeSkip).tag(Bool?.none)
                    Text(.profileMomFirstTimeYes).tag(Bool?.some(true))
                    Text(.profileMomFirstTimeNo).tag(Bool?.some(false))
                } label: {
                    Text(.profileMomFirstTime)
                }
            }

            Section {
                ListField(.profileMomConditions, items: $mom.conditions)
                ListField(.profileMomMedications, items: $mom.medications)
            } header: {
                Text(.profileMomHealthHeader)
            } footer: {
                Text(.profileListFooter)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle(Text(.profileMomTitle))
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        MomEditView(mom: MomProfile(previousBirths: 0))
    }
}
