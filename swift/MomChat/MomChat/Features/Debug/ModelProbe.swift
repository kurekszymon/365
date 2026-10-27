import Foundation
import FoundationModels

/// Runs one question through a fresh `LanguageModelSession` and measures it.
enum ModelProbe {
    struct Outcome: Sendable {
        enum Status: Equatable, Sendable {
            case answered
            case guardrail
            case refusal
            case unsupportedLanguage
            case cancelled
            case failed(String)

            var label: String {
                switch self {
                case .answered: "answered"
                case .guardrail: "guardrail"
                case .refusal: "refused by model"
                case .unsupportedLanguage: "unsupported language"
                case .cancelled: "cancelled"
                case .failed(let message): "error: \(message)"
                }
            }
        }

        var status: Status
        var answer: String
        var timeToFirstToken: Duration?
        var totalTime: Duration
        var tokens: Int?
        /// False when `tokens` is a characters/4 estimate (iOS before 26.4).
        var tokensAreExact: Bool
    }

    struct Settings: Sendable {
        var permissiveGuardrails = false
        var maximumResponseTokens = 600

        var model: SystemLanguageModel {
            permissiveGuardrails ? SystemLanguageModel(guardrails: .permissiveContentTransformations) : .default
        }
    }

    static func run(
        question: String,
        instructions: String,
        settings: Settings,
        onPartial: (String) -> Void = { _ in }
    ) async -> Outcome {
        let session = LanguageModelSession(model: settings.model, instructions: instructions)
        let options = GenerationOptions(maximumResponseTokens: settings.maximumResponseTokens)
        let clock = ContinuousClock()
        let start = clock.now
        var firstToken: Duration?
        var answer = ""
        var status = Outcome.Status.answered

        do {
            for try await snapshot in session.streamResponse(to: question, options: options) {
                if firstToken == nil, !snapshot.content.isEmpty {
                    firstToken = clock.now - start
                }
                answer = snapshot.content
                onPartial(answer)
            }
            if Task.isCancelled { status = .cancelled }
        } catch let error as LanguageModelSession.GenerationError {
            status = switch error {
            case .guardrailViolation: .guardrail
            case .refusal: .refusal
            case .unsupportedLanguageOrLocale: .unsupportedLanguage
            default: .failed(String(describing: error))
            }
        } catch is CancellationError {
            status = .cancelled
        } catch {
            // Framework failures arrive as bare NSErrors whose description is empty, so show domain + code.
            let ns = error as NSError
            status = .failed("\(ns.domain) \(ns.code)")
        }

        let total = clock.now - start
        let (tokens, exact) = await countTokens(answer, model: settings.model)
        return Outcome(
            status: status,
            answer: answer,
            timeToFirstToken: firstToken,
            totalTime: total,
            tokens: tokens,
            tokensAreExact: exact
        )
    }

    static func prewarm(instructions: String, settings: Settings) {
        LanguageModelSession(model: settings.model, instructions: instructions).prewarm()
    }

    private static func countTokens(_ text: String, model: SystemLanguageModel) async -> (Int?, Bool) {
        guard !text.isEmpty else { return (0, true) }
        if #available(iOS 26.4, *), let exact = try? await model.tokenCount(for: text) {
            return (exact, true)
        }
        return (max(1, text.count / 4), false)
    }
}

extension Duration {
    /// "1.42 s"
    var secondsText: String {
        let seconds = Double(components.seconds) + Double(components.attoseconds) / 1e18
        return seconds.formatted(.number.precision(.fractionLength(2))) + " s"
    }
}
