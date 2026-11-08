import Foundation
import FoundationModels

/// What the model returns. The disclaimer is added in code from `isMedical`, so it doesn't depend
/// on the model remembering to write it. `answer` comes first so it streams straight away.
@Generable
nonisolated struct SafeAnswer: Sendable {
    @Guide(description: "Your reply to her, following all the rules above.")
    var answer: String

    @Guide(description: "True if the reply touches health, symptoms, medication, pregnancy complications or a child's illness. False for everyday topics like routines, gear or names.")
    var isMedical: Bool

    /// Room for the schema in the prompt, on top of the answer itself.
    static let schemaTokenReserve = 100
}
