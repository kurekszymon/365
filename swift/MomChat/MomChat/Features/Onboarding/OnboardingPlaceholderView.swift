import SwiftUI

/// Stands in for the real onboarding flow (Stage 4).
struct OnboardingPlaceholderView: View {
    let onStart: () -> Void

    var body: some View {
        VStack(spacing: Spacing.l) {
            Spacer()
            Text("Welcome to MomChat")
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text("Answers for you and your baby, private on your phone.")
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            Button(action: onStart) {
                Text("Get started")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.m)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.capsule)
            .foregroundStyle(Palette.onAccent)
        }
        .multilineTextAlignment(.center)
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
    }
}

#Preview {
    OnboardingPlaceholderView {}
}
