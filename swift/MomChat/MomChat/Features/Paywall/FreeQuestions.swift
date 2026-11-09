import Foundation
import Observation
import Security

/// The free allowance before the paywall.
nonisolated enum FreeQuestions {
    static let limit = 20
    /// The chat says nothing about the allowance until this many are left.
    static let countdownFrom = 5
    /// How many times she can skip the paywall. Each skip gives one more question.
    static let skips = 3
}

/// Where the number of used questions is kept. `nil` = nothing readable right now.
protocol UsedQuestionsStore: AnyObject {
    func load() -> Int?
    func save(_ used: Int)
}

/// In the Keychain so deleting and reinstalling the app doesn't reset it. "This device only":
/// the allowance is per phone, and nothing goes to iCloud.
final class KeychainUsedQuestionsStore: UsedQuestionsStore {
    private let query: [String: Any]

    init(service: String = "com.kurek.MomChat.freeQuestions", account: String = "used") {
        query = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    func load() -> Int? {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(request as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return Int(String(decoding: data, as: UTF8.self))
    }

    func save(_ used: Int) {
        let data = Data(String(used).utf8)
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        guard status == errSecItemNotFound else { return }
        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }

    func delete() {
        SecItemDelete(query as CFDictionary)
    }
}

/// Counts the questions she has sent. The count only goes up: iOS can prewarm the app before the
/// first unlock, when the Keychain can't be read, and that must never look like a fresh allowance.
@Observable
final class FreeQuestionsCounter {
    private(set) var used = 0
    private(set) var skips = 0
    @ObservationIgnored private let store: UsedQuestionsStore
    @ObservationIgnored private let skipStore: UsedQuestionsStore

    init(store: UsedQuestionsStore, skipStore: UsedQuestionsStore) {
        self.store = store
        self.skipStore = skipStore
        reload()
    }

    var remaining: Int { max(FreeQuestions.limit + skips - used, 0) }
    var canSkip: Bool { skips < FreeQuestions.skips }
    var isUsedUp: Bool { remaining == 0 }

    func reload() {
        used = max(used, store.load() ?? 0)
        skips = max(skips, skipStore.load() ?? 0)
    }

    func consume() {
        guard !isUsedUp else { return }
        used += 1
        store.save(used)
    }

    /// One more question, in exchange for having seen the paywall.
    func skip() {
        guard isUsedUp, canSkip else { return }
        skips += 1
        skipStore.save(skips)
    }

    #if DEBUG
    func debugSetUsed(_ count: Int, skips newSkips: Int = 0) {
        used = count
        skips = newSkips
        store.save(count)
        skipStore.save(newSkips)
    }
    #endif
}
