import SwiftUI

/// "Has your baby arrived?" at the top of the chat, from 37 weeks (34 for twins, 32 for triplets or more).
struct BirthBannerView: View {
    let multiples: Int
    let onArrived: () -> Void
    let onNotYet: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s) {
            Text(multiples > 1 ? .birthBannerTitleMultiples : .birthBannerTitle)
                .font(.headline)
                .foregroundStyle(Palette.textPrimary)
            Text(multiples > 1 ? .birthBannerMessageMultiples : .birthBannerMessage)
                .font(Typography.caption)
                .foregroundStyle(Palette.textSecondary)
            HStack(spacing: Spacing.s) {
                Button(action: onArrived) {
                    Text(multiples > 1 ? .birthBannerYesMultiples : .birthBannerYes)
                        .font(Typography.chip)
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
                .foregroundStyle(Palette.onAccent)

                Button(action: onNotYet) {
                    Text(.birthBannerNotYet)
                        .font(Typography.chip)
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.capsule)
            }
            .padding(.top, Spacing.xs)
        }
        .padding(Spacing.l)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface, in: .rect(cornerRadius: Radius.bubble, style: .continuous))
        .padding(.horizontal, Spacing.l)
        .padding(.vertical, Spacing.s)
    }
}

#Preview {
    BirthBannerView(multiples: 1, onArrived: {}, onNotYet: {})
}
