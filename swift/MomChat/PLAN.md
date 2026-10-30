# MomChat — Private AI Parenting Chat

A chat assistant for **expecting and new moms**: through pregnancy, birth and up to age 3. **Everything runs and stays on the phone.** Questions, answers, pregnancy details and the child's details are never sent to an AI provider, to us, or to any third party.

Two entry points, one app: a mom who is pregnant today becomes a new mom in the same app, with her history intact.

**Stack:** Swift 6 · SwiftUI · iOS 26+ · iPhone only · Apple `FoundationModels` (on-device) · SwiftData · StoreKit 2

---

## Principles

1. **Nothing leaves the device.** No backend, no account, no analytics SDKs, no crash reporters, no iCloud. The only network traffic is StoreKit.
2. **The current stage is always in context.** Every answer takes into account the pregnancy week, or the child's exact age (corrected age for preemies), plus feeding and health notes.
   - Pregnancy and postpartum health data are some of the most sensitive data there is. Keeping it on the device is the main selling point for pregnant users, not a side feature.
3. **Safety before the model.** Red-flag emergencies never reach the model. They go to a call-emergency screen.
4. **Built for 3am.** One-handed use, dark-mode first, fast first token, short answers by default.

---

## Device Requirement

The app needs Apple Intelligence: iPhone 15 Pro or newer, iOS 26+, Apple Intelligence turned on, and a supported language.

`SystemLanguageModel.default.availability` is checked during onboarding and at every launch:

| State | Behavior |
|---|---|
| `.available` | Normal |
| `.unavailable(.appleIntelligenceNotEnabled)` | Explain the steps and deep-link to Settings |
| `.unavailable(.modelNotReady)` | "Model is downloading" screen, retries automatically |
| `.unavailable(.deviceNotEligible)` | Explain honestly. **Never show the paywall** |

Because unsupported phones must never reach the paywall, the app is a free download rather than paid upfront.

---

## Modules

| # | Module | Responsibility |
|---|--------|---------------|
| 1 | **Inference** | `LanguageModelSession` wrapper: streaming, context budgeting, error mapping (`exceededContextWindowSize`, `guardrailViolation`, `unsupportedLanguageOrLocale`) |
| 2 | **Prompting** | Builds the session instructions from the persona, safety rules, the child profile block and the locale |
| 3 | **Safety Gate** | Runs before inference: red-flag detection leads to the emergency screen. After inference: adds the medical disclaimer |
| 4 | **Profiles** | Mom profile + several children/pregnancies, the active one, stage (expecting / born), pregnancy week and age calculation (including corrected age), birth transition, profile editing |
| 5 | **Profile Memory** | A model tool that *proposes* profile updates found in chat. The user confirms each one with a single tap |
| 6 | **Chat** | Streaming bubbles, quick-action chips, conversation list per child, search |
| 7 | **Export** | One conversation becomes a PDF (child summary + Q&A + date) through the share sheet, for doctor visits |
| 8 | **Paywall** | 20 free questions (Keychain counter), StoreKit 2 subscriptions + lifetime purchase, restore, checking what the user is entitled to |
| 9 | **Privacy** | Optional FaceID lock, file protection, encrypted backup export/import, "delete everything" |
| 10 | **Onboarding** | Privacy promise, device check, first child profile, "20 free questions" screen |

A single app target. Modules start as folders and are split into a local Swift Package only when tests or build times call for it.

---

## Profiles

There are two kinds of profile: one **mom profile**, and one **child profile per baby** (born or expected). In pregnancy many questions are about the mom's own body (nausea, medications, sleep), and after birth about her recovery (C-section, breastfeeding, mood). So the mom has to be in context too, not just the child.

```swift
@Model final class MomProfile {
    var name: String?
    var previousBirths: Int?      // first-time mom changes tone and detail
    var conditions: [String]      // e.g. "gestational diabetes", "hypothyroidism"
    var medications: [String]
    var notes: [ProfileNote]
}

@Model final class Child {
    var name: String?             // nil = "Baby" (many parents haven't chosen yet)
    var stage: Stage              // .expecting / .born / .archived
    var dueDate: Date?            // required while expecting; used for corrected age later
    var birthDate: Date?          // set when the baby arrives
    var multiples: Int            // 1 = singleton, 2 = twins, 3 = triplets… (no upper limit)
    var multipleBirthID: UUID?    // shared by twins/triplets after birth
    var sex: Sex?                 // optional, can be "unknown / not telling"
    // Pregnancy
    var pregnancyConditions: [String]   // e.g. "placenta previa", "high blood pressure"
    // Birth & after
    var deliveryType: Delivery?   // vaginal / C-section; matters for mom's recovery answers
    var feeding: Feeding?         // breast / formula / mixed / solids+milk
    var allergies: [String]
    var conditions: [String]      // e.g. "reflux", "tongue tie (treated)"
    var medications: [String]
    var notes: [ProfileNote]      // facts saved from chat, each with a date
    var createdAt: Date
}
```

- **The due date can be entered directly or calculated from the first day of the last period** (+280 days). The mom can correct it after her dating scan.
- **The pregnancy week is calculated, never stored:** "24 weeks 3 days, 2nd trimester".
- **The age is calculated, never stored.** It's worked out each session and written precisely: "6 weeks 3 days", "7 months", "2 years 2 months".
- **Corrected age** applies when birth was 3+ weeks before the due date and the child is under 24 months. Both ages go into the prompt.
- **Each conversation belongs to one child or pregnancy.** Switching starts a new session. A mom pregnant with her second while raising a toddler has two profiles, which the profile list already supports.

### Birth Transition

From week 37, a gentle banner appears on the chat screen: **"Has your baby arrived? 🎉"**. A tap opens a short form:
- Birth date and time
- Name (pre-filled if already set)
- Sex (if it was unknown)
- Delivery type
- Feeding plan

The profile switches to `.born`.

**Twins, triplets and more.** One profile covers the whole pregnancy. At birth the form asks for name, sex and feeding **for each baby**, and the profile splits into one child per baby. The first baby keeps the original record, with the pregnancy conversations and notes. The others share the due date, birth date, delivery type and pregnancy conditions. All of them get the same `multipleBirthID`, so the prompt can say "twin of Kuba". Fewer babies than expected is allowed, but the copy for that case needs the same care as pregnancy loss. The pregnancy conversations stay visible in history under the same child. Starter chips switch from pregnancy topics to newborn topics. The banner can also be opened from the profile at any time (for early births).

### Pregnancy Loss

If the mom tells the assistant about a miscarriage or stillbirth, or chooses "End this pregnancy profile":
- The model answers with compassion, and the app suggests local support resources.
- The profile moves to `.archived`. Week counters, banners and pregnancy chips stop immediately.
- History is kept unless she deletes it.

This needs careful, native copy in both languages, and real users testing it in TestFlight.

### Prompt block (target ≤ 150 tokens, mom + child)

Expecting:
```
Mom: first pregnancy. Conditions: hypothyroidism (levothyroxine).
Pregnant: 24 weeks 3 days (2nd trimester), due Jan 30, singleton.
Pregnancy notes: gestational diabetes test scheduled (Oct 20).
```

Born:
```
Mom: 7 months postpartum, C-section, breastfeeding.
Child: Emma, girl, 7 months (corrected 6 months, born 4 weeks early).
Feeding: breastfed + started solids.
Allergies: none known. Conditions: mild reflux.
Recent notes: rolling both ways (Oct 2); first tooth (Oct 10).
```

Only the 5 most recent notes are included. The rest can be seen and edited in the profile. The mom line is shorter after the first year postpartum.

### Profile Memory

The model gets a `proposeProfileUpdate` tool (`FoundationModels` `Tool` with `@Generable` arguments). When the mom says something like "she threw up after eggs", the model calls the tool, and a card appears under the answer: **"Save to Emma's profile: possible egg reaction?" [Save] [Dismiss]**. Nothing is saved without a tap.

---

## Context Budget (~4K tokens total)

| Part | Budget |
|---|---|
| Instructions (persona + safety + style + locale) | ~500 |
| Profile block (mom + child) | ~150 |
| Tool definitions | ~150 |
| Conversation history | rest, minus the answer |
| Answer | ~600 reserved |

When the history gets too long, the oldest turns are compacted into a short summary (one extra model call) and a new session is started with that summary in its instructions. If we still hit `exceededContextWindowSize`, the app compacts and retries silently once.

---

## Safety

**Emergency gate (before the model).** A local list of keywords and patterns, per language and per stage. A match shows a full-screen card with "Call 112 / 911", based on the region, plus 2–3 steps to take while waiting. The model is not called.

- **Baby:** not breathing / turning blue, choking, unresponsive, seizure, fever ≥ 38 °C under 3 months, head injury with vomiting, poisoning, signs of severe dehydration.
- **Pregnancy:** vaginal bleeding, waters breaking or regular contractions before week 37, baby moving less than usual or not at all (after ~week 24), severe headache with vision changes or sudden swelling (possible preeclampsia), severe abdominal pain, fainting, fever.
  - For less acute pregnancy cases the card says "Call your midwife / maternity ward now" instead of the emergency number.
- **Postpartum mom:** heavy bleeding, fever or a wound that looks infected after a C-section, chest pain or shortness of breath, suicidal thoughts or thoughts of harming the baby.

**Postpartum mental health.** Postpartum depression and intrusive thoughts get supportive answers and a crisis line for the region. They're never dismissed.

**Disclaimer.** Answers on medical topics end with one short line telling the mom to check with her pediatrician or midwife. The model generates a `@Generable` flag `isMedical` with each answer, so the disclaimer is added in code instead of relying on the prompt.

**Guardrail refusals.** Apple's filter can block innocent questions about breastfeeding, genitals or rashes. A `guardrailViolation` error shows a friendly "I can't answer that one — please ask your pediatrician" message, never a raw error.

**Scope.** The assistant gives pregnancy and parenting information. It doesn't diagnose, never gives medication doses, and redirects to a professional instead.
- In pregnancy it never says a medication is "safe to take". It explains what is generally known and tells her to confirm with her doctor or pharmacist.
- Food-safety questions ("can I eat sushi?") are fine to answer with general guidance.

---

## Localization: English + Polish

- The Polish UI copy, instructions and red-flag keyword lists are **written natively in Polish, not translated**.
- Answers follow the app language. The instructions tell the model which language to reply in.
- Emergency numbers by region: PL 112 (+ 999), US 911, UK 999/111, EU 112. Crisis lines are localized the same way.
- Check that Apple's model answers well in Polish before launch, using a test set of ~50 real questions.

---

## Monetization

- Free download, so the device check happens before any payment.
- **20 free questions first, no payment step in onboarding** (decided 2026-10-30). Onboarding ends with "You have 20 free questions", and she starts asking with her profile already set up, so even the free answers are personalized. Inference is on-device, so free questions cost us nothing.
- **What counts:** each question she sends counts as one. Starter chips count once sent. The emergency gate (Stage 8) never counts and is never locked.
- **The counter** lives in the Keychain, not SwiftData, so deleting and reinstalling the app doesn't reset it. Only erasing the phone does, which is acceptable.
- **In the chat:** nothing is shown until 5 are left, then a small line above the input bar ("4 free questions left"). The 20th question is still answered in full, and the paywall opens after it. She is never cut off mid-answer.
- **After the free questions:** the paywall. **No free trial** (decided 2026-10-30): the 20 questions are the trial.
- Products: **monthly**, **yearly**, **lifetime** (one-time). Since inference is on-device we have no per-message costs, so lifetime is sustainable.
- No account. StoreKit 2 + `Transaction.currentEntitlements`, a "Restore Purchases" button, and Family Sharing turned on.
- Without an entitlement once the free questions are used up (or when a subscription lapses): history and profiles stay readable, sending new messages is locked.

### Paywall by Stage

**The free allowance is the same for everyone: 20 questions.** No special allowances. Only the paywall copy and the highlighted plan change with the stage chosen in onboarding:

| Stage | Headline | Plan selected by default |
|---|---|---|
| Expecting | "With you through pregnancy, birth and beyond" | Yearly (it covers the birth) |
| Baby is here | "Answers at 3am, private to you" | Yearly |
| Both | "One app for the bump and the little one" | Yearly |

Keep it easy:
- **One screen.** The headline, 3 short benefits (private, knows your baby/pregnancy, any time), the plans, one button.
- **Three plans at most.** Yearly is selected by default, with monthly and lifetime next to it.
- **Plain price wording:** "$29.99/year. Cancel anytime in Settings." No small print.
- **Visible way out:** a "Restore" button and a close button that goes back to the chat (she can read her history and profile but not send).
- **Also reachable before the free questions run out**, from Settings and from the "free questions left" line.
- **No account and no forms.** One tap goes straight to Apple's payment sheet.
- Everything is native SwiftUI on top of StoreKit 2 (`SubscriptionStoreView` where it fits), with no third-party paywall SDK.

---

## Privacy & Data

- The SwiftData store uses `FileProtectionType.complete`. Backups are excluded (`isExcludedFromBackup`), so nothing goes to iCloud Backup either.
- Optional FaceID/passcode lock, offered in onboarding.
- **Encrypted backup:** export a password-protected file (for moving to a new phone) and import it.
- "Delete everything" in Settings.
- App Store privacy label: **Data Not Collected**.
- No analytics: decisions rely on App Store Connect metrics plus voluntary in-app feedback (feedback opens Mail, nothing is sent automatically).

---

## Onboarding Flow

1. Welcome + privacy promise ("Your questions never leave this phone")
2. Device / Apple Intelligence check, handled per the device requirement table
3. **"Where are you right now?"**
   - 🤰 **I'm expecting**
   - 👶 **My baby is here**
   - Both (pregnant + already have a little one) creates two profiles
4. Stage-specific details:
   - **Expecting:** due date *or* first day of last period, first pregnancy?, twins?, baby name (optional), anything your doctor is watching (optional)
   - **Born:** baby's name, birth date, born early? (weeks), delivery type, feeding, allergies / conditions (optional)
5. FaceID lock (optional)
6. "You have 20 free questions" (no payment step; the paywall comes after the 20th question)
7. Chat, with starter chips for the stage:
   - Expecting: "Is this cramping normal at 8 weeks?", "What can I eat?", "What to pack for the hospital?"
   - Born: "How much should a 6-week-old sleep?", "Is this poop normal?", "When can I exercise after a C-section?"

The chat header always shows the stage: "Week 24 · 2nd trimester" or "Emma · 7 months".

---

## Out of Scope for v1

- iPad / Mac
- Sync between devices, partner sharing
- Feed, sleep and diaper tracking
- Weekly pregnancy content ("your baby is the size of a mango"), kick counter, contraction timer
  - Good v2 candidates since they keep pregnant users coming back, but they need content and design work
- Vetted knowledge base / RAG (candidate for v2 if answer quality is weak)
- Ages over 3
- Voice input (consider for v2: hands-free while holding the baby)

---

## Milestones

The step-by-step build order (16 stages, each ending with something you can run) and the checklist of what to prepare are in **[IMPLEMENTATION.md](IMPLEMENTATION.md)**.

In short: setup → app shell → **model go/no-go** → data → onboarding → profiles → real chat → context → safety → memory → paywall → privacy → PDF → polish → TestFlight → App Store.

---

## Open Questions

1. Name: "MomChat" excludes dads and other caregivers. Is that intentional (marketing focus) or should we use something neutral?
2. Pricing: suggested ~$4.99/mo, ~$29.99/yr, ~$59.99 lifetime. Check against competitors (Huckleberry, Wonder Weeks, etc.).
3. If the spike shows Polish quality is weak, do we launch EN-only first?
