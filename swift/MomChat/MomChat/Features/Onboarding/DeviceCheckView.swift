import SwiftUI

/// The Apple Intelligence check, shown in onboarding and at launch whenever the model isn't ready.
/// Retries on its own when the app comes back from Settings.
struct DeviceCheckView: View {
    let availability: ModelAvailability

    var body: some View {
        ModelUnavailableView(state: availability.state) {
            availability.refresh()
        }
        #if DEBUG
        .overlay(alignment: .topTrailing) {
            Button(String("Skip (debug)")) { availability.isSkipped = true }
                .font(Typography.caption)
                .padding()
        }
        #endif
    }
}
