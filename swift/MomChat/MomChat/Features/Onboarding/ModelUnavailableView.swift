import SwiftUI
import UIKit

/// Shown instead of the app while Apple Intelligence can't be used. Never leads to the paywall.
struct ModelUnavailableView: View {
    let state: ModelAvailability.State
    let onRetry: () -> Void

    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: Spacing.l) {
            Spacer()
            icon
                .font(.system(size: 48))
                .foregroundStyle(Palette.accent)
            Text(title)
                .font(Typography.largeTitle)
                .foregroundStyle(Palette.textPrimary)
            Text(message)
                .font(Typography.body)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            actions
        }
        .multilineTextAlignment(.center)
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
    }

    @ViewBuilder
    private var icon: some View {
        switch state {
        case .downloading, .checking: ProgressView().controlSize(.large).tint(Palette.accent)
        case .deviceNotEligible: Image(systemName: "iphone.slash")
        default: Image(systemName: "apple.intelligence")
        }
    }

    private var title: LocalizedStringResource {
        switch state {
        case .notEnabled: "Turn on Apple Intelligence"
        case .downloading, .checking: "Getting ready…"
        case .deviceNotEligible: "This iPhone can't run MomChat"
        case .available, .unavailable: "Apple Intelligence isn't available right now"
        }
    }

    private var message: LocalizedStringResource {
        switch state {
        case .notEnabled:
            "MomChat runs entirely on your iPhone using Apple Intelligence. Open Settings, go to Apple Intelligence & Siri, turn it on, then come back here."
        case .downloading, .checking:
            "Apple Intelligence is still downloading to your iPhone. This can take a while, so keep it on Wi-Fi and charging. MomChat will continue on its own when it's done."
        case .deviceNotEligible:
            "MomChat needs Apple Intelligence, which works on iPhone 15 Pro and newer. Everything happens on your phone, so there's no online version we could offer instead."
        case .available, .unavailable:
            "Check that Apple Intelligence is on and that your iPhone is set to a supported language, then try again."
        }
    }

    @ViewBuilder
    private var actions: some View {
        switch state {
        case .notEnabled:
            primaryButton("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
            }
        case .unavailable, .available:
            primaryButton("Try again", action: onRetry)
        case .downloading, .checking, .deviceNotEligible:
            EmptyView()
        }
    }

    private func primaryButton(_ title: LocalizedStringResource, action: @escaping () -> Void) -> some View {
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

#Preview("Not enabled") {
    ModelUnavailableView(state: .notEnabled) {}
}

#Preview("Downloading") {
    ModelUnavailableView(state: .downloading) {}
}

#Preview("Not eligible") {
    ModelUnavailableView(state: .deviceNotEligible) {}
}
