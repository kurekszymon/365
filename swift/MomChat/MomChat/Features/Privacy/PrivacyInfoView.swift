import SwiftUI

/// Settings → How your data is kept. Plain promises she can check against the App Store label.
struct PrivacyInfoView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                point("iphone", title: .privacyInfoOnDeviceTitle, detail: .privacyInfoOnDeviceDetail)
                point("person.crop.circle.badge.xmark", title: .privacyInfoNoAccountTitle, detail: .privacyInfoNoAccountDetail)
                point("lock.shield", title: .privacyInfoEncryptedTitle, detail: .privacyInfoEncryptedDetail)
                point("icloud.slash", title: .privacyInfoNoCloudTitle, detail: .privacyInfoNoCloudDetail)
                point("creditcard", title: .privacyInfoPurchasesTitle, detail: .privacyInfoPurchasesDetail)
                point("trash", title: .privacyInfoDeleteTitle, detail: .privacyInfoDeleteDetail)
            }
            .padding(Spacing.xl)
        }
        .background(Palette.background)
        .navigationTitle(Text(.privacyInfoTitle))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func point(_ symbol: String, title: LocalizedStringResource, detail: LocalizedStringResource) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.m) {
            Image(systemName: symbol)
                .foregroundStyle(Palette.accent)
                .frame(width: 28)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Palette.textPrimary)
                Text(detail)
                    .font(Typography.body)
                    .foregroundStyle(Palette.textSecondary)
            }
        }
    }
}

/// Pages that don't exist yet (checklist #7, #8). Their Settings rows stay hidden while `nil`.
nonisolated enum AppLinks {
    static let privacyPolicy: URL? = nil
    static let terms: URL? = nil
    static let supportEmail: String? = nil

    static var supportMail: URL? {
        supportEmail.flatMap { URL(string: "mailto:\($0)") }
    }
}

#Preview {
    NavigationStack { PrivacyInfoView() }
}
