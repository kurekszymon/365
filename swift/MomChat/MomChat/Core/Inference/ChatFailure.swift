import Foundation
import FoundationModels

/// Why an answer didn't come, in terms the chat can show. Never a raw error.
nonisolated enum ChatFailure: Equatable, Sendable {
    /// Apple's filter, or the model itself, declined. Often innocent questions (breastfeeding, rashes).
    case declined
    /// She wrote in a language the model doesn't support.
    case unsupportedLanguage
    /// The conversation no longer fits. Stage 7 compacts instead; for now she starts a new chat.
    case tooLong
    /// Apple Intelligence was turned off or the model is being updated.
    case modelUnavailable
    /// Busy or something unexpected: worth trying again.
    case retryable

    init(_ error: any Error) {
        guard let error = error as? LanguageModelSession.GenerationError else {
            self = .retryable
            return
        }
        switch error {
        case .guardrailViolation, .refusal: self = .declined
        case .unsupportedLanguageOrLocale: self = .unsupportedLanguage
        case .exceededContextWindowSize: self = .tooLong
        case .assetsUnavailable: self = .modelUnavailable
        default: self = .retryable
        }
    }

    /// Retrying the same question would hit the same wall for these.
    var canRetry: Bool {
        switch self {
        case .retryable, .modelUnavailable: true
        case .declined, .unsupportedLanguage, .tooLong: false
        }
    }
}
