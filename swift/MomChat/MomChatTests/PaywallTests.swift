import Foundation
import StoreKit
import StoreKitTest
import SwiftData
import Testing
@testable import MomChat

final class InMemoryUsedQuestionsStore: UsedQuestionsStore {
    var value: Int?

    init(_ value: Int? = nil) {
        self.value = value
    }

    func load() -> Int? { value }
    func save(_ used: Int) { value = used }
}

@MainActor
struct FreeQuestionsCounterTests {
    @Test func startsWithTheFullAllowance() {
        let counter = FreeQuestionsCounter(store: InMemoryUsedQuestionsStore(), skipStore: InMemoryUsedQuestionsStore())
        #expect(counter.remaining == 20)
        #expect(!counter.isUsedUp)
    }

    @Test func eachQuestionIsSavedAndTheCountStopsAtTheLimit() {
        let store = InMemoryUsedQuestionsStore(19)
        let counter = FreeQuestionsCounter(store: store, skipStore: InMemoryUsedQuestionsStore())
        counter.consume()
        counter.consume()
        #expect(store.value == 20)
        #expect(counter.isUsedUp)
    }

    @Test func anUnreadableKeychainNeverRestoresTheAllowance() {
        let store = InMemoryUsedQuestionsStore(12)
        let counter = FreeQuestionsCounter(store: store, skipStore: InMemoryUsedQuestionsStore())
        store.value = nil
        counter.reload()
        #expect(counter.used == 12)
    }

    @Test func aCountThatBecomesReadableLaterIsPickedUp() {
        let store = InMemoryUsedQuestionsStore(nil)
        let counter = FreeQuestionsCounter(store: store, skipStore: InMemoryUsedQuestionsStore())
        store.value = 20
        counter.reload()
        #expect(counter.isUsedUp)
    }

    @Test func keychainRoundTrip() {
        let store = KeychainUsedQuestionsStore(service: "com.kurek.MomChat.tests.\(UUID().uuidString)")
        defer { store.delete() }
        #expect(store.load() == nil)
        store.save(3)
        store.save(4)
        #expect(store.load() == 4)
    }
}

@MainActor
struct QuestionAccessTests {
    private func access(used: Int, owned: [OwnedProduct]? = []) -> QuestionAccess {
        let access = QuestionAccess(store: InMemoryUsedQuestionsStore(used), skipStore: InMemoryUsedQuestionsStore())
        if let owned { access.entitlements.apply(owned) }
        return access
    }

    @Test func aNormalQuestionCountsOnce() {
        let access = access(used: 3)
        #expect(access.admit(isSafetyMessage: false) == .allowed(isLastFree: false))
        #expect(access.free.used == 4)
    }

    @Test func theTwentiethIsAnsweredAndMarkedLast() {
        let access = access(used: 19)
        #expect(access.admit(isSafetyMessage: false) == .allowed(isLastFree: true))
        #expect(access.isLocked)
    }

    @Test func theTwentyFirstIsLockedAndNotCounted() {
        let access = access(used: 20)
        #expect(access.admit(isSafetyMessage: false) == .locked)
        #expect(access.free.used == 20)
    }

    @Test(arguments: [0, 19, 20])
    func safetyMessagesAreNeverLockedOrCounted(used: Int) {
        let access = access(used: used)
        #expect(access.admit(isSafetyMessage: true) == .allowed(isLastFree: false))
        #expect(access.free.used == used)
    }

    @Test func eachSkipGivesOneMoreQuestionUntilTheyRunOut() {
        let access = access(used: 20)
        for _ in 0..<FreeQuestions.skips {
            #expect(access.canSkipPaywall)
            access.skipPaywall()
            #expect(!access.isLocked)
            #expect(access.admit(isSafetyMessage: false) == .allowed(isLastFree: true))
            #expect(access.isLocked)
        }
        #expect(!access.canSkipPaywall)
        access.skipPaywall()
        #expect(access.admit(isSafetyMessage: false) == .locked)
        #expect(access.free.used == 20 + FreeQuestions.skips)
    }

    @Test func closingThePaywallBeforeTheAllowanceRunsOutUsesNoSkip() {
        let access = access(used: 15)
        access.skipPaywall()
        #expect(access.free.skips == 0)
        #expect(access.free.remaining == 5)
    }

    @Test func entitledQuestionsDontUseTheAllowance() {
        let access = access(used: 20, owned: [OwnedProduct(productID: ProductID.lifetime)])
        #expect(!access.isLocked)
        #expect(access.admit(isSafetyMessage: false) == .allowed(isLastFree: false))
        #expect(access.free.used == 20)
    }

    @Test func nobodyIsLockedBeforeStoreKitHasAnswered() {
        let access = access(used: 20, owned: nil)
        #expect(!access.isLocked)
        #expect(access.admit(isSafetyMessage: false) == .allowed(isLastFree: false))
    }

    @Test(arguments: [(14, Int?.none), (15, 5), (19, 1), (20, nil)])
    func theCountdownLineStartsAtFiveLeft(used: Int, shown: Int?) {
        #expect(access(used: used).remainingToShow == shown)
    }

    @Test func theCountdownIsHiddenOnceEntitled() {
        let access = access(used: 18, owned: [OwnedProduct(productID: ProductID.yearly)])
        #expect(access.remainingToShow == nil)
    }
}

struct OwnedProductTests {
    private let now = Date(timeIntervalSince1970: 1_000_000)

    @Test func lifetimeHasNoEnd() {
        #expect(OwnedProduct(productID: ProductID.lifetime).grantsAccess(on: now))
    }

    @Test func subscriptionEndsAtExpiry() {
        let product = OwnedProduct(productID: ProductID.monthly, expirationDate: now.addingTimeInterval(60))
        #expect(product.grantsAccess(on: now))
        #expect(!product.grantsAccess(on: now.addingTimeInterval(61)))
    }

    @Test func aRefundEndsAccess() {
        #expect(!OwnedProduct(productID: ProductID.lifetime, revocationDate: now).grantsAccess(on: now))
    }

    @Test func unknownProductsGrantNothing() {
        #expect(!OwnedProduct(productID: "com.example.other").grantsAccess(on: now))
    }
}

struct PaywallAudienceTests {
    @Test func copyFollowsTheCurrentProfiles() {
        #expect(PaywallAudience(stages: [.expecting]) == .expecting)
        #expect(PaywallAudience(stages: [.born]) == .baby)
        #expect(PaywallAudience(stages: [.born, .expecting]) == .both)
    }

    @Test func afterALossTheCopyDoesntMentionPregnancy() {
        #expect(PaywallAudience(stages: [.archived]) == .baby)
        #expect(PaywallAudience(stages: []) == .baby)
    }
}

/// The lock inside the real send path. None of these reach the model.
@MainActor
struct ChatLockTests {
    private func lockedChat() throws -> (ChatController, QuestionAccess, ModelContainer) {
        let container = try DataStore.makeInMemoryContainer()
        let child = Child(stage: .born, birthDate: .now.addingTimeInterval(-40 * 86_400))
        container.mainContext.insert(child)
        let access = QuestionAccess(store: InMemoryUsedQuestionsStore(20), skipStore: InMemoryUsedQuestionsStore())
        access.entitlements.apply([])
        let chat = ChatController(child: child, conversation: nil, context: container.mainContext, access: access)
        return (chat, access, container)
    }

    @Test func aNormalQuestionIsNotSentOrSavedWhenLocked() throws {
        let (chat, _, container) = try lockedChat()
        _ = container
        #expect(chat.send("how much should she sleep?") == .locked)
        #expect(chat.conversation == nil)
        #expect(!chat.isResponding)
    }

    @Test func anEmergencyStillOpensItsCardWhenLocked() throws {
        let (chat, access, container) = try lockedChat()
        _ = container
        #expect(chat.send("my baby is not breathing") == .handled)
        #expect(chat.presentedEmergency == .babyNotBreathing)
        #expect(chat.messages.count == 1)
        #expect(access.free.used == 20)
    }
}

/// Real StoreKit flows against `MomChat.storekit`.
@MainActor
@Suite(.serialized)
struct StoreKitFlowTests {
    private func session() throws -> SKTestSession {
        let config = URL(filePath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appending(path: "MomChat/Resources/MomChat.storekit")
        let session = try SKTestSession(contentsOf: config)
        session.disableDialogs = true
        session.clearTransactions()
        return session
    }

    /// StoreKit's list of current purchases can lag a moment behind a change.
    private func settles(_ entitlements: Entitlements, to expected: Bool) async -> Bool {
        for _ in 0..<50 {
            await entitlements.refresh()
            if entitlements.isEntitled == expected { return true }
            try? await Task.sleep(for: .milliseconds(200))
        }
        return false
    }

    @Test func allThreeProductsLoadWithFamilySharing() async throws {
        let session = try session()
        defer { session.clearTransactions() }
        let products = try await Product.products(for: ProductID.all)
        #expect(Set(products.map(\.id)) == Set(ProductID.all))
        let allShareable = products.allSatisfy { $0.isFamilyShareable }
        #expect(allShareable)
        let noneHasATrial = products.allSatisfy { $0.subscription?.introductoryOffer == nil }
        #expect(noneHasATrial)
    }

    @Test func aSubscriptionGrantsAccessUntilItExpires() async throws {
        let session = try session()
        defer { session.clearTransactions() }
        let entitlements = Entitlements()
        await entitlements.refresh()
        #expect(!entitlements.isEntitled)

        try await session.buyProduct(identifier: ProductID.yearly)
        #expect(await settles(entitlements, to: true))

        try session.expireSubscription(productIdentifier: ProductID.yearly)
        #expect(await settles(entitlements, to: false))
    }

    @Test func lifetimeGrantsAccess() async throws {
        let session = try session()
        defer { session.clearTransactions() }
        let entitlements = Entitlements()
        try await session.buyProduct(identifier: ProductID.lifetime)
        #expect(await settles(entitlements, to: true))
    }

    @Test func aJustBoughtPlanCountsBeforeStoreKitsListCatchesUp() async throws {
        let session = try session()
        defer { session.clearTransactions() }
        let entitlements = Entitlements()
        let bought = OwnedProduct(productID: ProductID.yearly, expirationDate: .now.addingTimeInterval(3_600))
        await entitlements.refresh(justBought: bought)
        #expect(entitlements.isEntitled)
    }
}
