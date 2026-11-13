import SwiftUI

/// Instead of a crash when the saved chats can't be opened (a failed migration, a full disk,
/// the phone locked mid-launch). Nothing is deleted; the emergency number stays one tap away.
struct StoreErrorView: View {
    let onRetry: () -> Void

    private let numbers = EmergencyNumbers.current

    var body: some View {
        VStack(spacing: Spacing.l) {
            Spacer()
            Image(systemName: "exclamationmark.bubble")
                .font(.system(size: 44))
                .foregroundStyle(Palette.accent)
                .accessibilityHidden(true)
            Text(.storeErrorTitle)
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text(.storeErrorDetail)
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            PrimaryButton(.storeErrorRetry, action: onRetry)
            if let number = numbers.emergency, let url = EmergencyNumbers.callURL(number) {
                Link(destination: url) {
                    Label {
                        Text(.storeErrorEmergency(number))
                    } icon: {
                        Image(systemName: "phone.fill")
                    }
                    .font(Typography.body)
                }
                .tint(Palette.accent)
                .padding(.top, Spacing.s)
            }
        }
        .multilineTextAlignment(.center)
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
    }
}

#Preview {
    StoreErrorView {}
}
