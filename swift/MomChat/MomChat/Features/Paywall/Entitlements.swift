import Foundation
import Observation
import StoreKit

/// Must match `MomChat.storekit` and App Store Connect.
nonisolated enum ProductID {
    static let monthly = "com.kurek.MomChat.monthly"
    static let yearly = "com.kurek.MomChat.yearly"
    static let lifetime = "com.kurek.MomChat.lifetime"
    static let all = [yearly, monthly, lifetime]
}

/// The parts of a transaction that decide access.
nonisolated struct OwnedProduct: Sendable {
    let productID: String
    var revocationDate: Date?
    var expirationDate: Date?

    init(productID: String, revocationDate: Date? = nil, expirationDate: Date? = nil) {
        self.productID = productID
        self.revocationDate = revocationDate
        self.expirationDate = expirationDate
    }

    init(_ transaction: Transaction) {
        self.init(
            productID: transaction.productID,
            revocationDate: transaction.revocationDate,
            expirationDate: transaction.expirationDate
        )
    }

    func grantsAccess(on date: Date) -> Bool {
        guard ProductID.all.contains(productID), revocationDate == nil else { return false }
        return expirationDate.map { $0 > date } ?? true
    }
}

/// What a tap on the paywall's button ended in.
nonisolated enum PurchaseOutcome: Sendable {
    case purchased, pending, cancelled, failed
}

/// Whether she has paid, from StoreKit's own on-device record. Nothing is stored by the app.
@Observable
final class Entitlements {
    private(set) var isEntitled = false
    /// False for the moment after launch before StoreKit has answered.
    private(set) var hasLoaded = false

    @ObservationIgnored private var updates: Task<Void, Never>?

    /// Listens for purchases made outside the paywall: renewals, Ask to Buy, Family Sharing, refunds.
    func start() async {
        if updates == nil {
            updates = Task { [weak self] in
                for await result in Transaction.updates {
                    if case .verified(let transaction) = result {
                        await transaction.finish()
                    }
                    await self?.refresh()
                }
            }
        }
        await refresh()
    }

    /// `justBought` counts even if StoreKit's list hasn't caught up with the purchase yet.
    func refresh(justBought: OwnedProduct? = nil) async {
        var owned = justBought.map { [$0] } ?? []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            owned.append(OwnedProduct(transaction))
        }
        apply(owned)
    }

    func apply(_ owned: [OwnedProduct], on date: Date = .now) {
        isEntitled = owned.contains { $0.grantsAccess(on: date) }
        hasLoaded = true
    }

    func handle(_ result: Product.PurchaseResult) async -> PurchaseOutcome {
        switch result {
        case .success(.verified(let transaction)):
            await transaction.finish()
            await refresh(justBought: OwnedProduct(transaction))
            return .purchased
        case .success(.unverified):
            return .failed
        case .pending:
            return .pending
        case .userCancelled:
            return .cancelled
        @unknown default:
            return .failed
        }
    }
}
