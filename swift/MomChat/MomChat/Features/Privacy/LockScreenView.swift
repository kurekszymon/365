import SwiftUI

/// Over everything while the app is locked. The emergency number stays one tap away, so a
/// scared mom whose Face ID fails can still call for help.
struct LockScreenView: View {
    @Environment(AppLock.self) private var lock

    private let numbers = EmergencyNumbers.current

    var body: some View {
        VStack(spacing: Spacing.l) {
            Spacer()
            Image(systemName: "lock.fill")
                .font(.system(size: 44))
                .foregroundStyle(Palette.accent)
                .accessibilityHidden(true)
            Text(.lockTitle)
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Spacer()
            PrimaryButton(lock.method == .faceID ? .lockUnlockFaceID : .lockUnlockPasscode) {
                Task { await lock.unlock() }
            }
            .disabled(lock.isAuthenticating)
            if let number = numbers.emergency, let url = EmergencyNumbers.callURL(number) {
                Link(destination: url) {
                    Label {
                        Text(.lockEmergency(number))
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

/// Shown whenever the app isn't active, so the app switcher's snapshot shows no chat.
/// Also briefly behind Face ID and Apple's purchase sheet, which make the app inactive.
struct PrivacyCoverView: View {
    var body: some View {
        Image(systemName: "lock.shield")
            .font(.system(size: 44))
            .foregroundStyle(Palette.accent)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.background)
            .accessibilityHidden(true)
    }
}

#Preview {
    LockScreenView()
        .environment(AppLock())
}
