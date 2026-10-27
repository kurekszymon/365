#if DEBUG
import FoundationModels
import SwiftUI

/// Developer tools, reachable from Settings in debug builds only. English-only on purpose.
struct DebugView: View {
    @State private var settings = ModelProbe.Settings()

    private let model = SystemLanguageModel.default

    var body: some View {
        List {
            Section {
                LabeledContent(String("Availability"), value: String(describing: ModelAvailability.map(model.availability)))
                LabeledContent(String("Supports English"), value: model.supportsLocale(Locale(identifier: "en_US")) ? "yes" : "no")
                LabeledContent(String("Supports Polish"), value: model.supportsLocale(Locale(identifier: "pl_PL")) ? "yes" : "no")
                LabeledContent(String("Context size"), value: "\(model.contextSize) tokens")
            } header: {
                Text(verbatim: "Model")
            }

            Section {
                Toggle(String("Permissive guardrails"), isOn: $settings.permissiveGuardrails)
                Stepper(String("Max answer: \(settings.maximumResponseTokens) tokens"), value: $settings.maximumResponseTokens, in: 100...1500, step: 100)
            } header: {
                Text(verbatim: "Settings")
            } footer: {
                Text(verbatim: "Used by the playground and the question runner. Permissive mode only relaxes the filter for text answers.")
            }

            Section {
                NavigationLink(String("Playground")) { PlaygroundView(settings: settings) }
                NavigationLink(String("Question runner")) { QuestionRunnerView(settings: settings) }
            }
        }
        .navigationTitle(Text(verbatim: "Developer"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// Type a question, pick a hand-written profile, watch the answer stream in.
struct PlaygroundView: View {
    let settings: ModelProbe.Settings

    @State private var profileID = "pregnant-8w"
    @State private var language = SpikePrompt.Language.en
    @State private var question = "Is cramping normal at 8 weeks?"
    @State private var answer = ""
    @State private var outcome: ModelProbe.Outcome?
    @State private var task: Task<Void, Never>?
    @State private var isShowingInstructions = false

    private var profile: SpikePrompt.Profile {
        SpikePrompt.profile(id: profileID) ?? SpikePrompt.profiles[0]
    }

    private var instructions: String {
        SpikePrompt.instructions(profile: profile, language: language)
    }

    var body: some View {
        Form {
            Section {
                Picker(String("Profile"), selection: $profileID) {
                    ForEach(SpikePrompt.profiles) { Text(verbatim: $0.name).tag($0.id) }
                }
                Picker(String("Answer language"), selection: $language) {
                    ForEach(SpikePrompt.Language.allCases) { Text(verbatim: $0.name).tag($0) }
                }
                Button(String(isShowingInstructions ? "Hide instructions" : "Show instructions")) {
                    isShowingInstructions.toggle()
                }
                if isShowingInstructions {
                    Text(verbatim: instructions)
                        .font(.caption.monospaced())
                        .textSelection(.enabled)
                }
            }

            Section {
                TextField(String("Question"), text: $question, axis: .vertical)
                    .lineLimit(2...6)
                if task == nil {
                    Button(String("Ask"), action: ask)
                        .disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                } else {
                    Button(String("Stop"), role: .destructive) { task?.cancel() }
                }
            }

            if !answer.isEmpty || task != nil {
                Section {
                    if answer.isEmpty {
                        ProgressView()
                    } else {
                        Text(verbatim: answer)
                            .font(Typography.body)
                            .textSelection(.enabled)
                    }
                } header: {
                    Text(verbatim: "Answer")
                }
            }

            if let outcome {
                Section {
                    LabeledContent(String("Status"), value: outcome.status.label)
                    LabeledContent(String("First token"), value: outcome.timeToFirstToken?.secondsText ?? "–")
                    LabeledContent(String("Total"), value: outcome.totalTime.secondsText)
                    LabeledContent(String("Tokens"), value: outcome.tokens.map { (outcome.tokensAreExact ? "" : "≈") + String($0) } ?? "–")
                } header: {
                    Text(verbatim: "Metrics")
                }
            }
        }
        .navigationTitle(Text(verbatim: "Playground"))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { ModelProbe.prewarm(instructions: instructions, settings: settings) }
        .onDisappear { task?.cancel() }
    }

    private func ask() {
        answer = ""
        outcome = nil
        let question = question
        let instructions = instructions
        task = Task {
            let result = await ModelProbe.run(question: question, instructions: instructions, settings: settings) { partial in
                answer = partial
            }
            outcome = result
            if answer.isEmpty, result.status != .answered {
                answer = "(\(result.status.label))"
            }
            task = nil
        }
    }
}

/// Runs every question in `questions.json` and exports the scoring sheet.
struct QuestionRunnerView: View {
    let settings: ModelProbe.Settings

    @State private var runner = EvalRunner()
    @State private var languages: Set<SpikePrompt.Language> = [.en, .pl]
    @State private var exportURL: URL?
    @State private var exportError: String?

    private var selectedCount: Int {
        runner.questions.filter { languages.contains($0.language) }.count
    }

    var body: some View {
        List {
            Section {
                if let error = runner.loadError {
                    Text(verbatim: error).foregroundStyle(.red)
                }
                LabeledContent(String("Questions loaded"), value: "\(runner.questions.count)")
                ForEach(SpikePrompt.Language.allCases) { language in
                    Toggle(isOn: Binding(
                        get: { languages.contains(language) },
                        set: { if $0 { languages.insert(language) } else { languages.remove(language) } }
                    )) {
                        Text(verbatim: "\(language.name) (\(runner.questions.filter { $0.language == language }.count))")
                    }
                }
                .disabled(runner.isRunning)

                if runner.isRunning {
                    Button(String("Stop"), role: .destructive) { runner.stop() }
                } else {
                    Button(String("Run \(selectedCount) questions")) {
                        runner.settings = settings
                        exportURL = nil
                        runner.start(languages: languages)
                    }
                    .disabled(selectedCount == 0)
                }
            }

            if let current = runner.current {
                Section {
                    Text(verbatim: current.question).font(.headline)
                    Text(verbatim: runner.currentPartial.isEmpty ? "…" : runner.currentPartial)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                } header: {
                    Text(verbatim: "Running \(runner.results.count + 1) of \(selectedCount) · \(current.id)")
                }
            }

            if !runner.results.isEmpty {
                Section {
                    if !runner.isRunning {
                        if let exportURL {
                            ShareLink(String("Share \(exportURL.lastPathComponent)"), item: exportURL)
                        } else {
                            Button(String("Export results")) {
                                do { exportURL = try runner.exportReport() } catch { exportError = error.localizedDescription }
                            }
                        }
                        if let exportError { Text(verbatim: exportError).foregroundStyle(.red) }
                    }
                    ForEach(runner.results.reversed()) { result in
                        ResultRow(result: result)
                    }
                } header: {
                    Text(verbatim: "Results")
                }
            }
        }
        .navigationTitle(Text(verbatim: "Question runner"))
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { runner.stop() }
        // Keep the phone awake through a long run.
        .onChange(of: runner.isRunning) { _, running in
            UIApplication.shared.isIdleTimerDisabled = running
        }
    }
}

private struct ResultRow: View {
    let result: EvalRunner.Result

    var body: some View {
        DisclosureGroup {
            Text(verbatim: result.outcome.answer.isEmpty ? "(no answer)" : result.outcome.answer)
                .font(.callout)
                .textSelection(.enabled)
            if !result.check.missing.isEmpty {
                Text(verbatim: "Missing: \(result.check.missing.joined(separator: ", "))").foregroundStyle(.orange)
            }
            if !result.check.forbiddenFound.isEmpty {
                Text(verbatim: "Forbidden: \(result.check.forbiddenFound.joined(separator: ", "))").foregroundStyle(.red)
            }
        } label: {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(verbatim: "\(result.question.id) · \(result.question.language.rawValue)")
                    .font(.headline)
                Text(verbatim: summary)
                    .font(.caption)
                    .foregroundStyle(result.outcome.status == .answered && result.check.passed ? Color.secondary : Color.red)
            }
        }
    }

    private var summary: String {
        let o = result.outcome
        var parts = [o.status.label, "first \(o.timeToFirstToken?.secondsText ?? "–")", "total \(o.totalTime.secondsText)"]
        if !result.question.mustMention.isEmpty || !result.question.mustNotSay.isEmpty {
            parts.append(result.check.passed ? "checks pass" : "checks FAIL")
        }
        return parts.joined(separator: " · ")
    }
}

#Preview {
    NavigationStack { DebugView() }
}
#endif
