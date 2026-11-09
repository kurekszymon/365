import Foundation
import Observation

/// Whether a question can go to the model: the free allowance plus what she has bought.
@Observable
final class QuestionAccess {
    enum Admission: Equatable {
        /// `isLastFree`: this used up the allowance, so the paywall follows the answer.
        case allowed(isLastFree: Bool)
        case locked
    }

    let free: FreeQuestionsCounter
    let entitlements = Entitlements()

    init(
        store: UsedQuestionsStore = KeychainUsedQuestionsStore(),
        skipStore: UsedQuestionsStore = KeychainUsedQuestionsStore(account: "skips")
    ) {
        free = FreeQuestionsCounter(store: store, skipStore: skipStore)
    }

    func start() async {
        free.reload()
        await entitlements.start()
    }

    func refresh() async {
        free.reload()
        await entitlements.refresh()
    }

    /// Waits for StoreKit, so someone who paid is never shown as locked just after launch.
    var isLocked: Bool {
        entitlements.hasLoaded && !entitlements.isEntitled && free.isUsedUp
    }

    var canSkipPaywall: Bool { isLocked && free.canSkip }

    /// Leaving the paywall while locked uses a skip, if any are left.
    func skipPaywall() {
        guard canSkipPaywall else { return }
        free.skip()
    }

    /// The number for the "N free questions left" line, when it should be on screen.
    var remainingToShow: Int? {
        guard entitlements.hasLoaded, !entitlements.isEntitled,
              (1...FreeQuestions.countdownFrom).contains(free.remaining) else { return nil }
        return free.remaining
    }

    /// Call once per question sent. Safety messages (red flags, crisis, grief) are never locked
    /// and never counted.
    func admit(isSafetyMessage: Bool) -> Admission {
        free.reload()
        if isSafetyMessage || entitlements.isEntitled { return .allowed(isLastFree: false) }
        if free.isUsedUp { return entitlements.hasLoaded ? .locked : .allowed(isLastFree: false) }
        free.consume()
        return .allowed(isLastFree: free.isUsedUp)
    }
}
