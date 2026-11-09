import SwiftData
import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(QuestionAccess.self) private var access
    @State private var isShowingPaywall = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        ProfilesView()
                    } label: {
                        Label {
                            Text(.settingsProfiles)
                        } icon: {
                            Image(systemName: "person.2")
                        }
                    }
                }

                Section {
                    if access.entitlements.isEntitled {
                        Text(.settingsPlanFullAccess)
                    } else {
                        Text(.settingsPlanFreeLeft(access.free.remaining))
                        Button(.settingsPlanSeePlans) { isShowingPaywall = true }
                    }
                }

                #if DEBUG
                Section {
                    NavigationLink(String("Developer tools")) { DebugView() }
                }
                #endif
            }
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle(Text(.settingsTitle))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(.commonDone) { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingPaywall) {
                PaywallView()
            }
        }
        .tint(Palette.accent)
    }
}

#Preview {
    SettingsView()
        .environment(QuestionAccess())
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
