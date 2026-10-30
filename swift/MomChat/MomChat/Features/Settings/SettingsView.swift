import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ContentUnavailableView(String(localized: .settingsComingSoon), systemImage: "gearshape")
                .foregroundStyle(Palette.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Palette.background)
                #if DEBUG
                .safeAreaInset(edge: .bottom) {
                    NavigationLink(String("Developer tools")) { DebugView() }
                        .font(Typography.caption)
                        .padding(Spacing.l)
                }
                #endif
                .navigationTitle(Text(.settingsTitle))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(.commonDone) { dismiss() }
                    }
                }
        }
    }
}

#Preview {
    SettingsView()
}
