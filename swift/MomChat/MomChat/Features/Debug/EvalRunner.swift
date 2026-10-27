import Foundation
import Observation
import UIKit

/// Runs the question set one by one and keeps the results for the report.
@Observable
final class EvalRunner {
    struct Result: Identifiable, Sendable {
        let question: EvalQuestion
        let outcome: ModelProbe.Outcome
        let check: EvalCheck.Result

        var id: String { question.id }
    }

    private(set) var questions: [EvalQuestion] = []
    private(set) var results: [Result] = []
    private(set) var current: EvalQuestion?
    private(set) var currentPartial = ""
    private(set) var loadError: String?
    private(set) var startedAt: Date?
    var settings = ModelProbe.Settings()

    private var task: Task<Void, Never>?

    var isRunning: Bool { task != nil }

    init() {
        loadBundled()
    }

    func loadBundled() {
        guard let url = EvalQuestionSet.bundled else {
            loadError = "questions.json is missing from the app bundle."
            return
        }
        do {
            questions = try EvalQuestionSet.load(from: url).questions
            let unknown = Set(questions.map(\.profile)).filter { SpikePrompt.profile(id: $0) == nil }
            loadError = unknown.isEmpty ? nil : "Unknown profile ids: \(unknown.sorted().joined(separator: ", "))"
        } catch {
            loadError = "Couldn't read questions.json: \(error)"
        }
    }

    func start(languages: Set<SpikePrompt.Language>) {
        guard task == nil else { return }
        let selected = questions.filter { languages.contains($0.language) }
        results = []
        startedAt = .now
        task = Task {
            for question in selected {
                guard !Task.isCancelled else { break }
                guard let profile = SpikePrompt.profile(id: question.profile) else { continue }
                current = question
                currentPartial = ""
                let outcome = await ModelProbe.run(
                    question: question.question,
                    instructions: SpikePrompt.instructions(profile: profile, language: question.language),
                    settings: settings
                ) { [weak self] partial in
                    self?.currentPartial = partial
                }
                guard outcome.status != .cancelled else { break }
                results.append(Result(
                    question: question,
                    outcome: outcome,
                    check: EvalCheck.check(outcome.answer, mustMention: question.mustMention, mustNotSay: question.mustNotSay)
                ))
            }
            current = nil
            task = nil
        }
    }

    func stop() {
        task?.cancel()
    }

    /// Writes the scoring sheet to a temporary file for the share sheet.
    func exportReport() throws -> URL {
        let day = (startedAt ?? .now).formatted(.iso8601.year().month().day())
        let url = FileManager.default.temporaryDirectory.appending(path: "results-\(day).md")
        let device = "\(UIDevice.current.model), iOS \(UIDevice.current.systemVersion)"
        let markdown = EvalReport.markdown(results: results, date: startedAt ?? .now, device: device, settings: settings)
        try markdown.write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}

enum EvalReport {
    static func markdown(results: [EvalRunner.Result], date: Date, device: String, settings: ModelProbe.Settings) -> String {
        var lines: [String] = []
        let refused = results.filter { $0.outcome.status == .guardrail || $0.outcome.status == .refusal }
        let checked = results.filter { !$0.question.mustMention.isEmpty || !$0.question.mustNotSay.isEmpty }
        let ttfts = results.compactMap(\.outcome.timeToFirstToken).sorted()
        let totals = results.filter { $0.outcome.status == .answered }.map(\.outcome.totalTime).sorted()

        lines.append("# MomChat eval: \(date.formatted(date: .abbreviated, time: .shortened))")
        lines.append("")
        lines.append("- Device: \(device)")
        lines.append("- Guardrails: \(settings.permissiveGuardrails ? "permissiveContentTransformations" : "default"), max \(settings.maximumResponseTokens) response tokens")
        lines.append("- Questions run: \(results.count)")
        lines.append("- Refused (guardrail or model): \(refused.count) (\(percent(refused.count, of: results.count)))")
        lines.append("- Must-mention / must-not-say: \(checked.filter(\.check.passed).count)/\(checked.count) passed")
        if let median = median(ttfts) { lines.append("- Median time to first token: \(median.secondsText)") }
        if let median = median(totals) { lines.append("- Median total time: \(median.secondsText)") }
        if results.contains(where: { !$0.outcome.tokensAreExact }) {
            lines.append("- Token counts marked ≈ are estimates (characters / 4)")
        }
        lines.append("")
        lines.append("Human columns: ✅ / ⚠️ / ❌. Safety is reviewed by the midwife for the safety set.")
        lines.append("")
        lines.append("| ID | Lang | Profile | Refused | TTFT | Total | Tokens | Checks | Profile use | Safe | Tone | Length | PL native |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
        for result in results {
            let o = result.outcome
            let refusedCell = switch o.status {
            case .answered: "no"
            case .guardrail, .refusal: "**yes**"
            default: o.status.label
            }
            let tokens = o.tokens.map { (o.tokensAreExact ? "" : "≈") + String($0) } ?? "–"
            let checks = checkCell(result)
            let plCell = result.question.language == .pl ? "" : "n/a"
            lines.append("| \(result.question.id) | \(result.question.language.rawValue) | \(result.question.profile) | \(refusedCell) | \(o.timeToFirstToken?.secondsText ?? "–") | \(o.totalTime.secondsText) | \(tokens) | \(checks) |  |  |  |  | \(plCell) |")
        }
        lines.append("")
        lines.append("## Answers")
        for result in results {
            lines.append("")
            lines.append("### \(result.question.id) · \(result.question.language.rawValue) · \(result.question.profile)")
            lines.append("")
            lines.append("**Q:** \(result.question.question)")
            lines.append("")
            if result.outcome.status != .answered {
                lines.append("_\(result.outcome.status.label)_")
                lines.append("")
            }
            let answer = result.outcome.answer.isEmpty ? "_(no answer)_" : result.outcome.answer
            lines.append(answer.split(separator: "\n", omittingEmptySubsequences: false).map { "> \($0)" }.joined(separator: "\n"))
            if !result.check.missing.isEmpty { lines.append("\nMissing: \(result.check.missing.joined(separator: ", "))") }
            if !result.check.forbiddenFound.isEmpty { lines.append("\nForbidden found: \(result.check.forbiddenFound.joined(separator: ", "))") }
        }
        return lines.joined(separator: "\n") + "\n"
    }

    private static func checkCell(_ result: EvalRunner.Result) -> String {
        if result.question.mustMention.isEmpty && result.question.mustNotSay.isEmpty { return "–" }
        return result.check.passed ? "pass" : "**fail**"
    }

    private static func percent(_ part: Int, of whole: Int) -> String {
        guard whole > 0 else { return "0%" }
        return (Double(part) / Double(whole)).formatted(.percent.precision(.fractionLength(0)))
    }

    private static func median(_ values: [Duration]) -> Duration? {
        values.isEmpty ? nil : values[values.count / 2]
    }
}
