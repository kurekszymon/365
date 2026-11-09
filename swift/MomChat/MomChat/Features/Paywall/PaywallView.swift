import StoreKit
import SwiftData
import SwiftUI

/// Who the copy speaks to, from the profiles she has now.
nonisolated enum PaywallAudience: Equatable, Sendable {
    case expecting, baby, both

    /// After a loss, or with no profiles, the copy doesn't mention a pregnancy.
    init(stages: [Child.Stage]) {
        switch (stages.contains(.expecting), stages.contains(.born)) {
        case (true, true): self = .both
        case (true, false): self = .expecting
        default: self = .baby
        }
    }

    var headline: LocalizedStringResource {
        switch self {
        case .expecting: .paywallHeadlineExpecting
        case .baby: .paywallHeadlineBaby
        case .both: .paywallHeadlineBoth
        }
    }

    var knowsYouBenefit: LocalizedStringResource {
        switch self {
        case .expecting: .paywallBenefitKnowsPregnancy
        case .baby: .paywallBenefitKnowsBaby
        case .both: .paywallBenefitKnowsBoth
        }
    }
}

/// One screen: headline, three benefits, the plans, one button.
struct PaywallView: View {
    private struct Plan: Identifiable {
        let id: String
        let title: LocalizedStringResource
        let priceLine: (String) -> LocalizedStringResource
    }

    private let plans = [
        Plan(id: ProductID.yearly, title: .paywallPlanYearly) { .paywallPlanYearlyPrice($0) },
        Plan(id: ProductID.monthly, title: .paywallPlanMonthly) { .paywallPlanMonthlyPrice($0) },
        Plan(id: ProductID.lifetime, title: .paywallPlanLifetime) { .paywallPlanLifetimePrice($0) },
    ]

    @Query private var children: [Child]
    @State private var products: [String: Product] = [:]
    @State private var loadFailed = false
    @State private var selectedID = ProductID.yearly
    @State private var isWorking = false
    @State private var notice: LocalizedStringResource?

    @Environment(QuestionAccess.self) private var access
    @Environment(\.dismiss) private var dismiss
    @Environment(\.purchase) private var purchase

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    Text(audience.headline)
                        .font(Typography.largeTitle)
                        .foregroundStyle(Palette.textPrimary)
                    benefits
                    planList
                }
                .padding(Spacing.xl)
            }
            .background(Palette.background)
            .safeAreaInset(edge: .bottom, spacing: 0) { footer }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(.paywallClose, systemImage: "xmark") { dismiss() }
                }
            }
        }
        .tint(Palette.accent)
        .task { await loadProducts() }
        // Covers Not now, the close button and swiping the sheet away.
        .onDisappear { access.skipPaywall() }
        .onChange(of: access.entitlements.isEntitled) { _, isEntitled in
            if isEntitled { dismiss() }
        }
    }

    private var audience: PaywallAudience {
        PaywallAudience(stages: children.map(\.stage))
    }

    private var benefits: some View {
        VStack(alignment: .leading, spacing: Spacing.m) {
            benefit(.paywallBenefitPrivate, systemImage: "lock.shield")
            benefit(audience.knowsYouBenefit, systemImage: "heart")
            benefit(.paywallBenefitAnyTime, systemImage: "moon.stars")
        }
    }

    private func benefit(_ text: LocalizedStringResource, systemImage: String) -> some View {
        Label {
            Text(text)
                .font(Typography.body)
                .foregroundStyle(Palette.textPrimary)
        } icon: {
            Image(systemName: systemImage)
                .foregroundStyle(Palette.accent)
        }
    }

    @ViewBuilder
    private var planList: some View {
        if products.isEmpty {
            if loadFailed {
                VStack(spacing: Spacing.m) {
                    Text(.paywallLoadFailed)
                        .font(Typography.body)
                        .foregroundStyle(Palette.textSecondary)
                        .multilineTextAlignment(.center)
                    Button(.paywallTryAgain) {
                        Task { await loadProducts() }
                    }
                }
                .frame(maxWidth: .infinity)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity)
            }
        } else {
            VStack(spacing: Spacing.s) {
                ForEach(plans) { plan in
                    if let product = products[plan.id] {
                        planRow(plan, product: product)
                    }
                }
            }
        }
    }

    private func planRow(_ plan: Plan, product: Product) -> some View {
        let isSelected = plan.id == selectedID
        return Button {
            selectedID = plan.id
        } label: {
            HStack(spacing: Spacing.m) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(plan.title)
                        .font(.headline)
                        .foregroundStyle(Palette.textPrimary)
                    Text(plan.priceLine(product.displayPrice))
                        .font(Typography.caption)
                        .foregroundStyle(Palette.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? Palette.accent : Palette.textSecondary)
            }
            .padding(Spacing.l)
            .background(Palette.surface, in: .rect(cornerRadius: Radius.field, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.field, style: .continuous)
                    .strokeBorder(isSelected ? Palette.accent : Palette.separator, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var footer: some View {
        VStack(spacing: Spacing.s) {
            if let notice {
                Text(notice)
                    .font(Typography.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
            }
            PrimaryButton(.paywallContinue, action: buy)
                .disabled(products[selectedID] == nil || isWorking)
            Button(.paywallRestore, action: restore)
                .font(Typography.chip)
                .disabled(isWorking)
            if access.canSkipPaywall {
                Button(.paywallNotNow) { dismiss() }
                    .font(Typography.chip)
                    .disabled(isWorking)
            }
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.vertical, Spacing.m)
        .background(Palette.background)
    }

    private func loadProducts() async {
        loadFailed = false
        let loaded = (try? await Product.products(for: ProductID.all)) ?? []
        products = Dictionary(loaded.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        loadFailed = loaded.isEmpty
    }

    private func buy() {
        guard let product = products[selectedID], !isWorking else { return }
        isWorking = true
        notice = nil
        Task {
            defer { isWorking = false }
            do {
                switch await access.entitlements.handle(try await purchase(product)) {
                case .pending: notice = .paywallPending
                case .failed: notice = .paywallPurchaseFailed
                case .purchased, .cancelled: break
                }
            } catch {
                notice = .paywallPurchaseFailed
            }
        }
    }

    private func restore() {
        guard !isWorking else { return }
        isWorking = true
        notice = nil
        Task {
            defer { isWorking = false }
            do {
                try await AppStore.sync()
                await access.entitlements.refresh()
                if !access.entitlements.isEntitled { notice = .paywallNothingToRestore }
            } catch StoreKitError.userCancelled {
                // She closed Apple's sign-in. Nothing to report.
            } catch {
                notice = .paywallRestoreFailed
            }
        }
    }
}

#Preview {
    PaywallView()
        .environment(QuestionAccess())
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
