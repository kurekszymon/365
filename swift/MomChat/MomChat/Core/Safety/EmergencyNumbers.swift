import Foundation

/// Phone numbers for the phone's region.
/// ⚠️ To be verified before TestFlight (IMPLEMENTATION.md, Stage 8).
nonisolated struct EmergencyNumbers: Equatable, Sendable {
    /// `nil` where we don't know the number: the card says "your local emergency number" instead.
    var emergency: String?
    /// A second emergency number, shown smaller.
    var alternative: String?
    /// Non-urgent medical advice line.
    var advice: String?
    var crisis: String?

    static func forRegion(_ region: String?) -> EmergencyNumbers {
        switch region?.uppercased() {
        case "PL": EmergencyNumbers(emergency: "112", alternative: "999", crisis: "800702222")
        case "US": EmergencyNumbers(emergency: "911", crisis: "988")
        case "GB": EmergencyNumbers(emergency: "999", advice: "111", crisis: "116123")
        case let region? where euRegions.contains(region): EmergencyNumbers(emergency: "112")
        default: EmergencyNumbers()
        }
    }

    static var current: EmergencyNumbers {
        forRegion(Locale.current.region?.identifier)
    }

    static func callURL(_ number: String) -> URL? {
        URL(string: "tel://\(number)")
    }

    private static let euRegions: Set<String> = [
        "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
        "LV", "LT", "LU", "MT", "NL", "PT", "RO", "SK", "SI", "ES", "SE",
    ]
}
