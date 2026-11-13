import Foundation
import UIKit

/// Settings → Send feedback: a draft in her own mail app. Nothing is sent until she taps Send,
/// and the draft holds only the app and phone details below, never chats or profile data.
nonisolated struct FeedbackMail: Equatable, Sendable {
    var appVersion: String
    var build: String
    var systemVersion: String
    var deviceModel: String
    var appLanguage: String

    var subject: String {
        String(localized: .settingsFeedbackSubject(String(localized: .appName), appVersion))
    }

    var body: String {
        String(localized: .settingsFeedbackBody(appVersion, build, systemVersion, deviceModel, appLanguage))
    }

    /// A `mailto:` URL with subject and body. Encoded by hand: `URLQueryItem` leaves `+` and `&`
    /// alone, which mail apps would read as a space and a new field.
    func url(to address: String) -> URL? {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        func encode(_ text: String) -> String {
            text.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
        }
        guard !address.isEmpty, let encodedAddress = address.addingPercentEncoding(withAllowedCharacters: .urlUserAllowed.union(["@"])) else { return nil }
        return URL(string: "mailto:\(encodedAddress)?subject=\(encode(subject))&body=\(encode(body))")
    }
}

extension FeedbackMail {
    /// This phone and this build.
    @MainActor static var current: FeedbackMail {
        let info = Bundle.main.infoDictionary ?? [:]
        return FeedbackMail(
            appVersion: info["CFBundleShortVersionString"] as? String ?? "?",
            build: info["CFBundleVersion"] as? String ?? "?",
            systemVersion: UIDevice.current.systemVersion,
            deviceModel: modelIdentifier,
            appLanguage: Bundle.main.preferredLocalizations.first ?? "?"
        )
    }

    /// "iPhone16,1" rather than "iPhone": tells which model without asking her.
    private static var modelIdentifier: String {
        if let simulated = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] {
            return simulated
        }
        var system = utsname()
        uname(&system)
        return withUnsafeBytes(of: &system.machine) { bytes in
            String(decoding: bytes.prefix { $0 != 0 }, as: UTF8.self)
        }
    }
}
