import Foundation
import LocalAuthentication
import Observation

/// How the phone confirms it's her. Phones that can run the model have Face ID, but it may not
/// be set up: then the passcode is used.
nonisolated enum LockMethod: Sendable {
    case faceID, passcode
}

/// Face ID with the passcode as fallback. Behind a protocol so tests don't need a face.
protocol DeviceAuthenticator {
    /// `nil` when the phone has no passcode, so no lock is possible.
    func availableMethod() -> LockMethod?
    func authenticate(reason: String) async -> Bool
}

final class SystemAuthenticator: DeviceAuthenticator {
    func availableMethod() -> LockMethod? {
        let context = LAContext()
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) else { return nil }
        // `biometryType` is only filled in after a biometrics check.
        let hasBiometrics = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        return hasBiometrics && context.biometryType == .faceID ? .faceID : .passcode
    }

    func authenticate(reason: String) async -> Bool {
        let context = LAContext()
        do {
            return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
        } catch {
            return false
        }
    }
}

/// The optional lock (off until she turns it on). Locks whenever the app goes to the background,
/// and asks once when it comes back. If she cancels, the lock screen's button asks again.
@Observable
final class AppLock {
    static let enabledKey = "privacy.lockEnabled"

    private(set) var isEnabled: Bool
    private(set) var isLocked: Bool
    private(set) var isAuthenticating = false

    /// Set when locking, cleared when asking. Cancelling Face ID makes the app inactive and then
    /// active again, which must not ask again in a loop.
    @ObservationIgnored private var shouldPrompt: Bool
    @ObservationIgnored private let authenticator: DeviceAuthenticator
    @ObservationIgnored private let defaults: UserDefaults

    init(authenticator: DeviceAuthenticator = SystemAuthenticator(), defaults: UserDefaults = .standard) {
        self.authenticator = authenticator
        self.defaults = defaults
        let isEnabled = defaults.bool(forKey: Self.enabledKey)
        self.isEnabled = isEnabled
        self.isLocked = isEnabled
        self.shouldPrompt = isEnabled
    }

    /// Read each time: she can set up Face ID or remove the passcode while the app is open.
    var method: LockMethod? { authenticator.availableMethod() }

    /// Face ID or passcode. Asked before turning the lock on or off.
    func confirmOwner() async -> Bool {
        guard !isAuthenticating else { return false }
        isAuthenticating = true
        defer { isAuthenticating = false }
        return await authenticator.authenticate(reason: String(localized: .lockReason))
    }

    /// No check here: callers confirm the owner first (Settings) or already did (onboarding).
    func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        defaults.set(enabled, forKey: Self.enabledKey)
        if !enabled {
            isLocked = false
            shouldPrompt = false
        }
    }

    func didEnterBackground() {
        guard isEnabled else { return }
        isLocked = true
        shouldPrompt = true
    }

    /// Call when the app becomes active. Asks at most once per lock.
    func promptIfNeeded() async {
        guard isLocked, shouldPrompt else { return }
        shouldPrompt = false
        await unlock()
    }

    func unlock() async {
        guard isLocked else { return }
        // If the passcode was removed the lock can't work any more; don't shut her out.
        guard method != nil else {
            setEnabled(false)
            return
        }
        if await confirmOwner() {
            isLocked = false
        }
    }

    /// "Delete everything": the lock goes with the data.
    func reset() {
        defaults.removeObject(forKey: Self.enabledKey)
        isEnabled = false
        isLocked = false
        shouldPrompt = false
    }
}
