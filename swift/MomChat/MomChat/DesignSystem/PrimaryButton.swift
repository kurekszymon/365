import SwiftUI

/// The full-width capsule button at the bottom of a screen.
struct PrimaryButton: View {
    let title: LocalizedStringResource
    let action: () -> Void

    init(_ title: LocalizedStringResource, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.m)
        }
        .buttonStyle(.borderedProminent)
        .buttonBorderShape(.capsule)
        .foregroundStyle(Palette.onAccent)
    }
}
