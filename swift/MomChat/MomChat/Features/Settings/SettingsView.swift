import SwiftData
import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss

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
        }
        .tint(Palette.accent)
    }
}

#Preview {
    SettingsView()
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
