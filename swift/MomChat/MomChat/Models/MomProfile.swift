import Foundation
import SwiftData

/// The one mom profile. In pregnancy and postpartum many questions are about her own body,
/// so she is in the prompt next to the child.
@Model final class MomProfile {
    var name: String?
    /// 0 = first-time mom, which changes tone and detail. `nil` = not answered.
    var previousBirths: Int?
    var conditions: [String] = []
    var medications: [String] = []
    @Relationship(deleteRule: .cascade, inverse: \ProfileNote.mom)
    var notes: [ProfileNote] = []
    /// The child or pregnancy the chat is about, switched on the profiles screen.
    var activeChild: Child?
    var createdAt: Date

    init(name: String? = nil, previousBirths: Int? = nil, createdAt: Date = .now) {
        self.name = name
        self.previousBirths = previousBirths
        self.createdAt = createdAt
    }
}
