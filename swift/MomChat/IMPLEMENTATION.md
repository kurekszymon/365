# MomChat — Implementation Plan

This turns `PLAN.md` into a build order. **Every stage ends with something you can run on your iPhone**, so progress is visible at each step. Do the stages in order, since each one builds on the one before.

Each stage has the same parts:
- **Build:** what gets written
- **You prepare:** what only you can do (accounts, content, decisions)
- **Demo:** what you'll see when you run the app
- **Done when:** the check before moving on

---

## How Each Stage Runs (Review Gate)

**Claude never starts the next stage on its own.** Every stage follows the same 6 steps:

1. **Kickoff:** you say "start Stage N". Claude restates the scope in a few lines and lists any open decisions, then asks only what blocks the work.
2. **Build:** Claude writes the code in small, reviewable steps.
3. **Self-check:** Claude builds with `xcodebuild` and runs the tests before handing over. Failures are reported honestly, never hidden.
4. **Hand-off:** Claude stops and gives you:
   - what changed (files, a short summary)
   - a **"Try this on your phone"** script: 3–8 concrete steps with the expected result for each
   - known gaps or shortcuts taken
   - for stages that touch the model (2, 6–9, 13), the answer-quality report (see below)
5. **Your feedback:** run the script and reply with what's wrong, what feels off, or "Stage N approved". Claude fixes things and hands off again (back to step 4) until you approve.
6. **Close:** Claude proposes a commit message and adds an entry to `PROGRESS.md`. You commit.

### PROGRESS.md

A running log in the repo, updated at the end of every stage, so a later session can pick up exactly where we stopped:

```markdown
## Stage 4: Onboarding ✅ approved 2026-10-24
- Built: stage fork, detail forms, profile saving, paywall placeholder
- Feedback fixed: date picker too small; Polish "Spodziewam się" wording
- Deferred: due-date validation for >42 weeks (→ Stage 5)
- Decisions: last-period field optional, due date required
```

---

## Answer Quality Checks

The model's answers are the product, so they get checked as carefully as the code.

**The test set** (`evals/questions.json`): your 50 questions from Stage 2. Each has a language, stage, profile and an optional "must mention / must not say" list, e.g. a 6-week-old with fever must mention "call a doctor" and must never give a paracetamol dose.

**Scoring sheet** (`evals/results-YYYY-MM-DD.md`). Claude runs the set and fills in the automatic columns. **You** fill in the human columns:

| Column | Filled by | Scale |
|---|---|---|
| Refused by guardrail | auto | yes / no |
| Time to first token, total time | auto | seconds |
| Must-mention / must-not-say | auto | pass / fail |
| Uses the profile correctly (age, name, week) | you | ✅ / ⚠️ / ❌ |
| Medically sensible and safe | you (midwife for the safety set) | ✅ / ⚠️ / ❌ |
| Tone (warm, calm, not preachy) | you | ✅ / ⚠️ / ❌ |
| Length right for 3am | you | ✅ / ⚠️ / ❌ |
| Polish sounds native (PL only) | you | ✅ / ⚠️ / ❌ |

**When it runs**
- **Stage 2:** the first baseline, which is the go/no-go.
- **After every prompt or safety change** (Stages 6–9, 13). The new results are compared to the previous run, and anything that got worse is flagged in the hand-off.
- **Before TestFlight and before submission.**

**Bar to pass:** 0 ❌ on safety, ≤5% guardrail refusals on normal questions, and ≥80% ✅ on profile use and tone. Every ❌ becomes either a prompt fix or a new test question.

**Real feedback:** answers you flag while using the app go into `evals/questions.json`, so the test set grows from real use.

---

## Before You Start: Checklist

Do these early. Some take days to be approved.

| # | Item | Why | Lead time |
|---|---|---|---|
| 1 | **Mac with Xcode 26** (App Store) and macOS 26 | Needed for the iOS 26 SDK and `FoundationModels` | 1h |
| 2 | **Apple Intelligence turned on on the Mac** (System Settings → Apple Intelligence & Siri) | The simulator uses the Mac's model. Without it you can only test on a real phone | Model download ~30 min |
| 3 | **iPhone 15 Pro or newer** on iOS 26, Apple Intelligence on, set to English (and Polish later) | Real-device testing of speed, memory and FaceID | — |
| 4 | **Apple Developer Program**: ✅ active until **Dec 9, 2026**. Turn on auto-renew now (developer.apple.com → Account → Membership) | If it lapses: TestFlight builds stop working, the app is removed from sale, and you can't sign new builds. Development continues, but on-device installs expire after 7 days | Check before Dec 1 |
| 5 | **Paid Applications Agreement + bank + tax forms** in App Store Connect → Business | **Subscriptions can't be tested in the sandbox or sold until this is active** | 1–5 days, start in week 1 |
| 6 | **App name + bundle ID**, e.g. `com.yourname.momchat` | Can't be changed after release. Decide on Open Question #1 (the name) first | Decision |
| 7 | **Privacy policy + terms of use pages** (a simple static page or Notion) | Required for any app with subscriptions, even one that collects no data | 2h |
| 8 | **Support email / URL** | Required by App Store Connect | 10 min |
| 9 | **50 real test questions**: 25 pregnancy + 25 baby, each in EN and PL | Stage 2 go/no-go. Ask real moms (forums, friends) for the exact wording they'd type at 3am | 1–2 days |
| 10 | **A midwife or pediatrician to review the safety rules** (paid hour or a friend) | The red-flag lists and emergency copy should be checked by a professional before TestFlight | Book by Stage 8 |
| 11 | **App icon** (1024×1024) | Needed by Stage 13 | — |
| 12 | **~20 beta testers** (pregnant women and new moms, EN + PL) | Stage 14 | Start collecting now |

---

## Project Structure (target)

```
swift/
├── PLAN.md
├── IMPLEMENTATION.md
├── PROGRESS.md              ← stage log, updated at every close
├── evals/                   ← questions.json + dated results
└── MomChat/
    ├── MomChat.xcodeproj
    ├── MomChat/
    │   ├── App/                 ← MomChatApp.swift, root routing
    │   ├── DesignSystem/        ← colors, typography, reusable views
    │   ├── Models/              ← SwiftData: MomProfile, Child, Conversation, Message
    │   ├── Core/
    │   │   ├── Inference/       ← LanguageModelSession wrapper, context budget
    │   │   ├── Prompting/       ← instructions + profile block builder
    │   │   ├── Safety/          ← emergency gate, keyword lists, disclaimer
    │   │   └── Dates/           ← pregnancy week, age, corrected age
    │   ├── Features/
    │   │   ├── Onboarding/
    │   │   ├── Profiles/
    │   │   ├── Chat/
    │   │   ├── Paywall/
    │   │   ├── Settings/
    │   │   └── Export/
    │   └── Resources/
    │       ├── Localizable.xcstrings   ← EN + PL from day one
    │       └── MomChat.storekit        ← local StoreKit testing
    └── MomChatTests/            ← Swift Testing
```

No third-party dependencies. Only Apple frameworks: SwiftUI, SwiftData, FoundationModels, StoreKit, LocalAuthentication, PDFKit, CryptoKit.

---

## Stage 0: Project Setup

**Build**
- A new Xcode project and git setup (`.gitignore` for `xcuserdata`, `DerivedData`).
- Deployment target **iOS 26.0**, **iPhone only** (remove iPad from Supported Destinations), Swift 6 language mode, portrait only.
- Create the folder groups from the structure above.
- Add a String Catalog with **English + Polish**.
- A test target with Swift Testing.

**You prepare**
- Checklist items 1–6.
- Create the project in Xcode: *File → New → Project → iOS → App*, Interface SwiftUI, Storage **None** (we add SwiftData ourselves), Testing System **Swift Testing**. Save it to `swift/MomChat/`. Select your team under *Signing & Capabilities*.
- Then tell me, and I'll handle the folders, settings and the rest of this stage.

**Demo:** a blank "MomChat" screen on your iPhone.

**Done when:** it builds and runs on both the simulator and your phone, and the first commit is made.

---

## Stage 1: First App Shell

**Build**
- Design tokens: colors (warm, calm, **dark mode first**), fonts (Dynamic Type), spacing.
- A root view that switches between `Onboarding` and `Main` based on whether a profile exists. Hardcoded at first.
- A static **Chat screen** with fake messages: bubbles, an input bar, quick-action chips, and a stage header ("Week 24 · 2nd trimester").
- An empty Settings screen.
- All visible text comes from the String Catalog (EN + PL).

**You prepare**
- Pick a mood or 2–3 apps you like the look of. I'll match the palette.
- The Polish copy for the first ~20 UI strings, written natively.

**Demo:** a convincing (fake) chat on your phone, in light and dark mode, in English and Polish (switch in the Xcode scheme → App Language).

**Done when:** the chat screen looks right one-handed on your phone.

---

## Stage 2: Model Spike (Go/No-Go)

**Build**
- `ModelAvailability`: wraps `SystemLanguageModel.default.availability` and shows the right screen for each state (not enabled / downloading / device not eligible).
- A hidden **debug screen** with a text field: a hand-written profile block is sent to `LanguageModelSession`, and the answer **streams** in.
- A **question runner** in the debug screen: it loads your 50 questions from a JSON file and runs each one with a pregnancy or baby profile. For each it records the answer, the time to first token, the total time, the approximate token count, and whether it was refused by the guardrail. Results can be exported as a text file to read on the Mac.

**You prepare**
- Checklist item 9: the 50 questions in EN + PL as JSON (I'll give you the template).
- **Read the answers and judge them.** Are they correct, safe, warm, in proper Polish? How often were they refused?

**Demo:** ask "Is cramping normal at 8 weeks?" and watch the answer stream in on your phone.

**Done when:** you decide **go** (Apple's model is good enough), **go EN-only** (Polish too weak), or **rethink** (a different model, see PLAN.md). Nothing after this stage is worth building until this is decided.

---

## Stage 3: Data Models + Date Logic

**Build**
- SwiftData models: `MomProfile`, `Child` (with `stage`), `Conversation`, `Message`, `ProfileNote`.
- The store with `FileProtectionType.complete` and excluded from backups. This is set up now so it's never forgotten.
- `Core/Dates`:
  - Due date from the last period (+280 days)
  - Pregnancy week and trimester
  - Age as text ("6 weeks 3 days", "7 months")
  - Corrected age
  - Both EN and PL wording, including Polish plural forms (tydzień / tygodnie / tygodni)
- **Unit tests** for all the date logic: leap years, born exactly at 37 weeks, corrected age switching off at 24 months, Polish plurals.

**You prepare:** nothing. Review the field list in `PLAN.md` once more, because changing models later means data migrations.

**Demo:** the debug screen shows calculated stages for a few sample profiles. The tests pass.

**Done when:** `⌘U` is green.

---

## Stage 4: Onboarding

**Build**
1. Welcome + privacy promise
2. Device check (reuses Stage 2)
3. **"Where are you right now?"** (Expecting / Baby is here / Both)
4. Detail forms for each stage (due date or last period, number of babies (1 or more); birth date, born early, delivery type, feeding; optional conditions). "Baby is here" with twins/triplets creates one child per baby with a shared `multipleBirthID`
5. Saves the `MomProfile` + `Child` profile(s)
6. **"You have 20 free questions" screen** ("Start asking" button). No payment step in onboarding; the counter itself comes in Stage 10
7. Lands in the chat (still fake answers)

**You prepare**
- Onboarding copy in EN + PL, written natively. I'll draft English, you write Polish.
- Decide which fields are required and which can be skipped.

**Demo:** delete the app, reinstall, go through onboarding as a pregnant mom, and the chat header shows "Week 24". Repeat as a new mom and it shows "Emma · 7 months".

**Done when:** all three paths work and relaunching the app skips onboarding.

---

## Stage 5: Profiles Screen

**Build**
- A profile list (mom + children), switching the active child, editing every field.
- Adding a second child or pregnancy later.
- **Birth transition:** the "Has your baby arrived?" banner from week 37 (plus a manual entry point), and a form that switches the profile to `.born`.
  - **Twins/triplets:** the form shows one name/sex/feeding block per baby (from `multiples`, no upper limit) and calls `Child.recordBirth` (built in Stage 3), which splits the profile into one child per baby. The banner is earlier for multiples (twins are usually born around 36–37 weeks, triplets earlier). Decide in this stage whether the pregnancy conversations also appear under the siblings (they stay on the first baby's record).
- **End/archive a pregnancy** (the loss flow, UI only; copy finalized in Stage 8).

**You prepare:** write the birth-transition copy (it's a happy moment, so make it warm).

**Demo:** set the due date to tomorrow, see the banner, mark the baby as born, and the header changes to "Baby · 1 day".

**Done when:** you can go through pregnancy → born → second pregnancy with no data lost, and a twin pregnancy becomes two children.

---

## Stage 6: Real Chat

**Build**
- `Prompting`: the instructions (persona, style, language, scope) + the profile block, following the PLAN.md examples, ≤150 tokens.
- `Inference`: one `LanguageModelSession` per conversation, streaming into the bubble, a stop button.
- Messages saved to SwiftData. A conversation list for each child, and search.
- Starter chips that depend on the stage.
- Error mapping (`guardrailViolation`, `unsupportedLanguageOrLocale`, …) to friendly messages.

**You prepare**
- Review the system prompt with me: tone, length, how "mom-like" it should sound.
- Use the app yourself for a few days with real questions.

**Demo:** ask real questions and get answers that use the child's name and age. Close the app, reopen it, and the history is still there.

**Done when:** the answers clearly use the profile, and nothing crashes on refusals.

---

## Stage 7: Context Management

**Build**
- A token budget following the PLAN.md table.
- Compacting old turns into a summary, then a new session seeded with it.
- Silently retrying once on `exceededContextWindowSize`.
- A debug overlay showing current token use.

**You prepare:** have one very long conversation (30+ messages) and check that the model still remembers what matters.

**Demo:** a long chat keeps working, and the debug overlay shows compaction happening.

**Done when:** no context error ever reaches the user.

---

## Stage 8: Safety

**Build**
- `EmergencyGate`: keyword and pattern lists **for each language and stage** (baby / pregnancy / postpartum), checked before the model.
- A full-screen emergency card with the number for the region (`Locale.current.region`) and 2–3 steps.
- A "Call your midwife" variant for less urgent pregnancy cases.
- The `@Generable` response with an `isMedical` flag, and the disclaimer added in code.
- Handling postpartum mental health and pregnancy loss in the prompt, plus the archive flow.
- **Tests:** every red-flag phrase (EN + PL, typos, no Polish diacritics like "krwawie" vs "krwawię") triggers the gate.

**You prepare**
- **The red-flag phrase lists in Polish**, written natively the way a scared mom would actually type them.
- Checklist item 10: a midwife or pediatrician reviews the lists and the emergency card text.
- Verify the emergency and crisis numbers for PL / US / UK / EU.

**Demo:** type "baby not breathing" or "krwawię w 20 tygodniu" and the emergency screen appears instantly, with no model answer.

**Done when:** the professional has approved the lists and all gate tests pass.

---

## Stage 9: Profile Memory

**Build**
- A `proposeProfileUpdate` tool (`Tool` + `@Generable` arguments).
- A confirm card under the answer ("Save to Emma's profile: …?" Save / Dismiss).
- Saved notes go into the profile block (the 5 most recent).

**You prepare:** a list of ~15 example messages that *should* trigger a save, and ~15 that *shouldn't*.

**Demo:** "she threw up after eggs" → a card → Save → the note appears in the profile and is mentioned in the next answer.

**Done when:** few false proposals in your test list, and nothing is ever saved without a tap.

---

## Stage 10: Paywall

**Build**
- **Free questions:** a `FreeQuestions` counter in the Keychain (survives reinstall), 20 per phone. Each sent question counts once, the emergency gate never counts. A "N free questions left" line above the input bar from 5 left. The 20th question is answered in full, then the paywall opens.
- A local `MomChat.storekit` config: monthly, yearly, lifetime (no trial: the 20 free questions replace it). You can test everything without App Store Connect.
- The paywall screen with stage-dependent copy, yearly pre-selected, Restore, close.
- An `Entitlements` service on top of `Transaction.currentEntitlements` + `Transaction.updates`.
- Locking sending (but not reading) when the free questions are used up and there's no entitlement.
- Wires the onboarding "20 free questions" screen from Stage 4 to the real counter.

**You prepare**
- Checklist item 5 must be **active** by now.
- In App Store Connect: create the app record, a subscription group, the 3 products with **the same IDs as the `.storekit` file**, and prices for each country (no introductory offer). Turn on Family Sharing.
- Final prices (Open Question #2).
- A sandbox tester account (App Store Connect → Users and Access → Sandbox).

**Demo:** use up the 20 free questions (a debug button can set the counter), see the paywall, buy yearly in the simulator, use Xcode's *Debug → StoreKit → Manage Transactions* to expire the subscription, and sending gets locked while history is still readable.

**Done when:** the free allowance survives a reinstall, and purchase, restore, expiry and lifetime all work, locally and in the sandbox on your phone.

---

## Stage 11: Privacy Features

**Build**
- Optional FaceID/passcode lock (`LocalAuthentication`), offered in onboarding and toggled in Settings. The app is blurred in the app switcher.
- **Encrypted backup:** export everything to a password-protected file (CryptoKit, AES-GCM, key derived from the password), and import it on a new phone.
- **Delete everything** with a confirmation.
- Settings: privacy explanation, manage subscription, restore, support, privacy policy link.

**You prepare:** decide whether the lock is on by default or opt-in (PLAN.md says optional).

**Demo:** export a backup, delete the app, reinstall, import, and everything is back.

**Done when:** the backup round-trip works and a wrong password fails cleanly.

---

## Stage 12: PDF Export

**Build**
- Export one conversation to PDF: a profile summary, date, Q&A, and a note saying it was generated on-device. Shared through the share sheet.

**You prepare:** look at a sample PDF and check it's what you'd hand a doctor.

**Demo:** open a conversation, tap Share, choose PDF, and AirDrop it to your Mac.

**Done when:** the PDF looks clean in both languages.

---

## Stage 13: Polish Pass

**Build**
- Complete the Polish translations (no missing keys in the String Catalog).
- Accessibility: VoiceOver labels, Dynamic Type up to XXL, contrast.
- App icon, launch screen, haptics, empty states, small animations.
- Performance check: time to first token, cold start.

**You prepare**
- All remaining Polish copy.
- The app icon (checklist item 11).

**Done when:** you'd be proud to show it to a stranger.

---

## Stage 14: TestFlight Beta

**Build**
- Archive and upload, with TestFlight notes in EN + PL.
- An in-app "Send feedback" item that opens a Mail draft (nothing is sent automatically).

**You prepare**
- Invite the beta testers (checklist item 12).
- 2 weeks of collecting feedback. Watch the answer quality, the refusals, and how often the emergency gate triggers by mistake.

**Done when:** no blocking bugs remain and testers would recommend it.

---

## Stage 15: App Store Submission

**You prepare** (I'll help with the drafts)
- Store listing in EN + PL: name, subtitle, description, keywords.
- Screenshots (6.9" + 6.5"), one set for pregnancy and one for baby.
- Privacy nutrition label: **Data Not Collected**.
- Age rating questionnaire (medical/treatment information: "Infrequent/Mild").
- **Review notes:** explain that inference happens on-device, the emergency gate, the disclaimers, that there's no account, and how to test the subscription. Health apps get extra scrutiny under guideline 1.4.1, so state clearly that the app provides information, not diagnosis.
- Mark "Requires Apple Intelligence" clearly in the description to avoid bad reviews.

**Done when:** approved. 🎉

---

## Working Together

- Every stage goes through the **review gate** above. Nothing moves on without your "approved".
- Claude proposes commit messages. You commit.
- Anything under "You prepare" can be started earlier. The long-lead items (5, 9, 10, 12) are worth starting **this week**.
- **Timeline vs. membership:** reaching TestFlight (Stage 14) before **Dec 9** is possible but tight. Renewing the membership takes the pressure off. Don't rush safety (Stage 8) to beat the date.
