import Foundation
import SwiftData

/// A fact saved from chat ("first tooth"), on the mom or on a child. Only saved after a tap.
@Model final class ProfileNote {
    var text: String
    var createdAt: Date
    var mom: MomProfile?
    var child: Child?

    init(text: String, createdAt: Date = .now) {
        self.text = text
        self.createdAt = createdAt
    }
}
