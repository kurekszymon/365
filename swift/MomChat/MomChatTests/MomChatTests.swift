import Foundation
import Testing
@testable import MomChat

struct LocalizationTests {
    @Test func appShipsEnglishAndPolish() {
        let localizations = Bundle.main.localizations
        #expect(localizations.contains("en"))
        #expect(localizations.contains("pl"))
    }
}
