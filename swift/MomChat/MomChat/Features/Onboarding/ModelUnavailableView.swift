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
        case .notEnabled: .deviceCheckNotEnabledTitle
        case .downloading, .checking: .deviceCheckDownloadingTitle
        case .deviceNotEligible: .deviceCheckNotEligibleTitle
        case .available, .unavailable: .deviceCheckUnavailableTitle
        }
    }

    private var message: LocalizedStringResource {
        switch state {
        case .notEnabled:
            .deviceCheckNotEnabledMessage
        case .downloading, .checking:
            .deviceCheckDownloadingMessage
        case .deviceNotEligible:
            .deviceCheckNotEligibleMessage
        case .available, .unavailable:
            .deviceCheckUnavailableMessage
        }
    }

    @ViewBuilder
    private var actions: some View {
        switch state {
        case .notEnabled:
            PrimaryButton(.deviceCheckNotEnabledOpenSettings) {
                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
            }
        case .unavailable, .available:
            PrimaryButton(.deviceCheckTryAgain, action: onRetry)
        case .downloading, .checking, .deviceNotEligible:
            EmptyView()
        }
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
