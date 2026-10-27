import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ContentUnavailableView("Coming soon", systemImage: "gearshape")
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
                .navigationTitle("Settings")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}

#Preview {
    SettingsView()
}
