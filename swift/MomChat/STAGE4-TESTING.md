# Stage 4: Onboarding — Testing Guide

Stage 4 is done when **all three paths work and relaunching skips onboarding**. Run this on your iPhone, then send back what's wrong, what feels off, or "Stage 4 approved".

---

## Already checked on the simulator

- 67 unit tests pass (`-only-testing:MomChatTests`), including 14 new ones in `OnboardingTests.swift`
- A throwaway UI test (not committed) drove all three paths: Expecting → "Week 8", Baby is here with twins → "Emma · born today", Both → "Week 20". It also checked that relaunching skips onboarding and that the debug reset sends you back to the welcome screen
- **Not checked:** turning on the "Born early" toggle (the UI test's tap didn't flip it), dark mode, a real phone

---

## Fixed along the way: crash on "Get started"

`Color(light:dark:)` in `DesignSystem/Palette.swift` was main-actor isolated (the project's default), but SwiftUI sometimes resolves colors on a background render thread, and that crashed with `_dispatch_assert_queue_fail`. This bug dates from Stage 1 and the new screens were the first to hit it. The extension is now `nonisolated`. **If any screen crashes, tell me.** It may be the same kind of bug.

---

## What changed

**Onboarding flow** (`Features/Onboarding/`)
- `OnboardingView`: welcome → device check → "Where are you right now?" → details → "You have 20 free questions" → chat. Nothing is saved until the last *Continue*, so quitting halfway starts over cleanly
- `WelcomeStep`: title, subtitle and three privacy lines
- `DeviceCheckView`: reuses the Stage 2 screens. Skipped when the model is already available. On a phone that can't run it there's no way forward, so the paywall is never reached. *Skip (debug)* still works in debug builds
- `PathStep`: three cards, "I'm expecting", "My baby is here" and "Both"
- `PregnancyDetailsStep`: due date **or** last period (shows the calculated due date), number of babies, "First pregnancy?" (not on the Both path), name and sex (only for one baby), what the doctor is watching
- `BirthDetailsStep`: birth date, number of babies (one name/sex/allergies/conditions block per baby), born early + weeks early, delivery, feeding
- `FreeQuestionsStep`: "You have 20 free questions", "Start asking". There's no payment step in onboarding. The counter, the "N left" line and the paywall come in Stage 10 (`FreeQuestions.limit = 20` in `Features/Paywall/`)

**Rules and saving** (`OnboardingDraft.swift`)
- Due date from 2 weeks ago to 40 weeks ahead. The last-period picker is limited to the matching range
- Birth date not in the future and not more than 3 years ago
- Twins or more when the baby is here: one `Child` per baby with a shared `multipleBirthID`. Twins while expecting: one profile with `multiples = 2`
- Born early: due date = birth date + weeks early, so corrected age works (only from 4 weeks early, i.e. before 37w0d)
- Allergies, conditions and doctor notes are split on commas, semicolons and new lines

**Chat**
- `ChatHeader`: "Week 24 · 2nd trimester", "Emma · 7 months", "Baby · born today", and a corrected-age subtitle for preemies
- Chips depend on the stage (pregnancy: Back pain…, baby: Sleep, Feeding, Crying, Poop)
- The fake Stage 1 conversation is gone. Sending only adds your bubble, and real answers come in Stage 6

**Other**
- `MomProfile.activeChild`: the child or pregnancy the chat is about (additive, migrates automatically)
- `RootView`: onboarding until a profile exists, then the model check, then the chat
- `PrimaryButton`: a shared capsule button (also used by the model check screens)
- Developer tools → **Delete all data and restart onboarding**
- String Catalog: every user-facing string in the app (99) is now a dotted key with an English value, used through generated symbols, so no literals are left in code. "onboarding.freeQuestions.title" needs Polish plural forms with translator comments, 4 stale fake-chat strings removed

---

## Try this on your phone

| # | Do this | Expect |
|---|---|---|
| 1 | Delete the app and install it again from Xcode | Welcome screen, three privacy lines with aligned icons, *Get started* |
| 2 | *Get started* → **I'm expecting** → switch to **Last period**, pick a date ~8 weeks ago | "Due date: …" appears under the picker, about 32 weeks from now |
| 3 | Set *First pregnancy?* = Yes, type something in the doctor field, then *Continue* | "You have 20 free questions" screen. Tap *Start asking* → chat header "Week 8 · 1st trimester", pregnancy chips |
| 4 | Force-quit and reopen the app | Straight into the chat, no onboarding |
| 5 | Settings → Developer tools → **Delete all data and restart onboarding** → confirm | Back on the welcome screen |
| 6 | **My baby is here** → birth date 7 months ago, **Babies: 2**, name them | Two baby blocks, "Baby 1" / "Baby 2". After finishing, the header shows "First name · 7 months" and baby chips |
| 7 | Reset → **My baby is here** → turn on **Born early**, set 6 weeks, birth date 2 months ago | The weeks stepper appears under the toggle. The header subtitle shows "Corrected age …" |
| 8 | Reset → **Both** | Baby form first, then the pregnancy form **without** "First pregnancy?". The chat opens on the pregnancy ("Week …") |
| 9 | Repeat any path in **dark mode** | Forms, cards and buttons are readable |

Also worth a look: does anything feel too long or confusing to fill in one-handed at 3am?

---

## Changed after the first hand-off (2026-10-30)

- **No payment step in onboarding, and no free trial.** Everyone gets 20 free questions, then the paywall (Stage 10). PLAN.md (Monetization) and IMPLEMENTATION.md (Stages 4 and 10) are updated to match
- The new last screen wasn't screenshot-checked in the simulator. It builds and the tests pass
- All strings moved to keyed catalog entries. If any screen shows a raw key like `onboarding.path.title` instead of English, that's a bug, so tell me

---

## Decisions for you

1. **"Both" opens the chat on the pregnancy.** Switching comes in Stage 5. Should the existing child come first instead?
2. **"First pregnancy? → No" is saved as 1 earlier birth.** The app doesn't ask how many. OK?
3. **Twin pregnancies skip name and sex.** Names are given per baby at birth (Stage 5). OK?
4. **Birth date only, no time of birth.** OK for now?

---

## Known gaps

- Polish for all 99 keys (and the Stage 1–2 ones) is still missing
- The free-questions screen isn't wired to a counter yet, so nothing is counted or locked (→ Stage 10)
- No FaceID step yet. There's a slot for it between the details and the free-questions screen (→ Stage 11)
- No model answers in the chat yet (→ Stage 6)
