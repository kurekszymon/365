# Stage 2: Model Spike — Testing Guide

Stage 2 decides **go**, **go EN-only** or **rethink**. Run this on your iPhone and send back:
1. What "Supports Polish" shows on the Developer tools screen
2. The exported `results-YYYY-MM-DD.md` (default guardrails, plus the permissive run if you do step 7)

---

## Simulator vs. phone

| What | Simulator | iPhone |
|---|---|---|
| Apple Intelligence check screens | ✅ (only the state your Mac is in) | ✅ |
| Developer tools, Playground, Question runner screens | ✅ | ✅ |
| Model info (availability, supported languages, context size) | ✅ | ✅ |
| **Generating answers** (streaming, timings, refusals) | ❌ on this Mac | ✅ |

On this Mac, every generation fails immediately with `GenerationError -1`, because the model's safety filter can't load (`SensitiveContentAnalysisML 15` / `ModelManagerError 1026`). Plain "Say hi" fails too, with both default and permissive guardrails. So the problem is the environment, not the app.

Caveat: I saw this in the unit-test host, not in the running app. If you want, try the simulator app once (step 4 below). If it shows `error: FoundationModels.LanguageModelSession.GenerationError -1`, the simulator is out for this stage. Either way, **the go/no-go numbers have to come from the phone**, because speed and quality on the Mac's model don't tell you what the phone will do.

---

## ⚠️ Polish may not be supported

The Mac's model lists 23 supported languages: da, de, en, es, fr, it, ja, ko, nb, nl, pt, sv, tr, vi, zh. **Polish isn't one of them**, and `supportsLocale(pl_PL)` returns false. If the phone shows the same, Polish answers will either fail with "unsupported language" or come back in weak Polish. That points to **go EN-only** or **rethink** (a different model, see PLAN.md).

---

## What changed

**Apple Intelligence check** (`Core/Inference/ModelAvailability.swift`, `Features/Onboarding/ModelUnavailableView.swift`)
- `RootView` checks the model before onboarding and shows one of these screens:
  - **Turn on Apple Intelligence**, with an *Open Settings* button
  - **Getting ready…** while the model downloads. It checks again every 5 s and continues on its own
  - **This iPhone can't run MomChat**, an honest explanation with no way through to the paywall
  - **Apple Intelligence isn't available right now**, for unknown reasons, with *Try again*
- It checks again whenever the app comes back to the foreground, for example after you turn Apple Intelligence on in Settings.
- Debug builds have a **Skip (debug)** button, so you can still look at the UI when the model is unavailable.

**Developer tools** (`Features/Debug/`, debug builds only): Settings → *Developer tools* at the bottom
- **Model:** availability, whether English and Polish are supported, context size
- **Settings:** permissive guardrails on/off, maximum answer length (default 600 tokens)
- **Playground:** pick one of 6 hand-written profiles and an answer language, ask a question, and watch the answer stream in. Shows status, time to first token, total time and token count. *Show instructions* displays the exact prompt the model gets.
- **Question runner:** runs every question in `questions.json`, one by one, each in a fresh session. It keeps the screen awake. You can filter by language, stop at any time, expand each result to read the answer, and *Export results* to the share sheet.

**Test set** (`evals/questions.json`, `evals/README.md`)
- A template with 10 sample questions (8 English, 2 Polish). The README describes the format.
- The app includes it through the symlink `MomChat/Resources/questions.json`, so edit it in `evals/` and rebuild.
- Profiles you can use: `pregnant-8w`, `pregnant-24w`, `pregnant-36w`, `newborn-3w`, `baby-7m`, `toddler-2y`.

**Tests** (`MomChatTests/EvalTests.swift`): 7 new ones, covering the must-mention / must-not-say check (including Polish diacritics and `ł`), loading the question file, and the availability states. All 8 tests pass.

**Fix from Stage 1:** the string catalog had lost its only Polish entry, so the app no longer included Polish and the localization test was failing. I restored the `"MomChat"` entry. The 10 new screen strings are in the catalog in English, and their Polish is left for you.

---

## Try this on your phone

| # | Do | Expected |
|---|---|---|
| 1 | Run from Xcode on your iPhone | The onboarding placeholder appears straight away |
| 2 | Turn Apple Intelligence off in Settings, then go back to the app | "Turn on Apple Intelligence". Turn it back on and return: the screen goes away by itself |
| 3 | *Get started* → ⚙️ → *Developer tools* | Availability says `available`. **Write down what "Supports Polish" says** |
| 4 | *Playground* → *Ask* (prefilled: "Is cramping normal at 8 weeks?", 8-week profile) | The answer streams in within 1–2 s, and the metrics show the timings |
| 5 | Switch the answer language to Polish, ask "czy to normalne że tak mnie ciągnie w podbrzuszu?" | One of these: an answer in Polish (judge it), `unsupported language`, or an answer in English. Note which |
| 6 | *Question runner* → *Run 10 questions* → wait → *Export results* → AirDrop to your Mac → save in `evals/` | A `results-YYYY-MM-DD.md` with the automatic columns filled in and every answer |
| 7 | Back in Developer tools, turn on *Permissive guardrails*, then repeat step 6 | A second report, to compare refusal counts |

After that, open the report and fill in the human columns (profile use, safety, tone, length, Polish quality) with ✅ / ⚠️ / ❌.

---

## Known gaps

- The 10 questions only show the format. The real 50, in the exact wording moms use (checklist item 9), are still to come. Replace the 2 Polish samples with real phrasing.
- The instructions and profiles in `SpikePrompt.swift` are hand-written, and Stage 6 replaces them. The profile blocks are in English even for Polish answers.
- The debug code and `questions.json` are also built into Release (only the screen is hidden). I'll remove them before TestFlight.
- The new screen strings have no Polish yet, same as the Stage 1 strings.
- No answer-quality baseline yet. It comes from your exported reports.
