# MomChat — What's Missing

Review of 2026-11-08, at `55b30f3`. Checked against `PLAN.md`, `IMPLEMENTATION.md` and `PROGRESS.md`.

Verified that day: unit tests pass on the iPhone 17 Pro simulator; the Release build succeeds with no `questions.json` or eval code in it. Gate results come from running the phrases below through the real `EmergencyGate` code. Nothing has been checked against the real model.

## Stage status

| Stage | Code | Phone test | Approved | Blocking it |
|---|---|---|---|---|
| 2, 4, 5, 6 | ✅ | not logged | not logged | Approval never recorded in `PROGRESS.md` |
| 7 Context | ✅ | ❌ | ❌ | Real compaction has never run |
| 8 Safety | ✅ built | ❌ | ❌ | Needs professional approval; see `testing/STAGE8-TESTING.md`, "Before Stage 8 can close" |
| 9 Memory | ✅ built | ❌ | ❌ | Tool never run against the real model; false-proposal rate unknown |
| 10–15 | ❌ | | | Not started |

## 1. Fix before Stage 10: emergency gate

### Structural

- [ ] **Pregnant, with a toddler as the active profile.** The gate only checks the active profile's stage, so "my waters broke at 30 weeks" and "im bleeding and im 20 weeks pregnant" get no card. The "Both" onboarding path creates this setup.
- [ ] **After ending a pregnancy, with a child over 1 as the active profile.** Archiving moves the chat to the newest remaining child, and that child's context has no pregnancy or postpartum rules, so "heavy bleeding after my miscarriage" gets no card. An archived profile can't itself be the active chat.
- [ ] **Wrong card for the mom.** With a newborn profile, `.child` rules match first-person messages: "i cant breathe" opens the baby-not-breathing card, so the postpartum chest and breathing rule can't fire for that phrase. "I lost consciousness" and "I had a seizure" also open baby cards.

### Phrases that got no card

Add these and keep them as regression tests in `SafetyTests.swift`.

| Situation | Missed |
|---|---|
| Unresponsive baby | "i cant wake my baby", "cannot wake him up", "she will not wake up", "baby wont wake" |
| Fever under 3 months | "my newborn has a temperature", "she has a high temperature", "she feels burning up", "ma temperature", "38 degrees" |
| Breathing | "having trouble breathing", "difficulty breathing", "she looks blue", "his face is blue" |
| Swallowed objects | "swallowed a pill", "ate a pill", "she took my pills", "swallowed a magnet", "swallowed a coin" |
| Crisis | "I do not want to live", "nie chce juz zyc", "nie chcę już żyć", "everyone would be better off without me", "i cant go on", "i cant do this anymore", "i want to end it all" |
| Pregnancy | "really bad stomach pain", "bad cramps", "baby stopped kicking", "hasnt kicked all day", "has not moved today" |
| After birth | "im bleeding a lot", "soaked through a pad", "krwawię bardzo mocno" |
| Toddler profile, mom's own symptom | "chest pain" (postpartum rules end at 365 days) |

**For the midwife to decide:** should "i am spotting" and "plamienie" open a card? They currently don't.

**False alarms (cheaper, still worth a look):** "he walks with a limp" opens the unresponsive-baby card; "she drank her medicine fine" opens the poisoning card.

## 2. Fix before Stage 10: other

- [ ] **Loss flow differs from `PLAN.md`.** Telling the chat about a loss shows a support card, but doesn't archive the profile or offer to. Week counter, birth banner, chips and "Pregnant: N weeks" in the prompt continue until she finds the option in her profile. Offer archiving from the support card.
- [ ] **Archived chats can't be read.** `PLAN.md` says history is kept, but the archived profile screen only has the due date, Restore and Delete. Restoring brings the pregnancy back as active, which is a painful way to reach those chats. Add a read-only chat list.

## 3. Needs you

- [ ] Run the phone scripts in `testing/`: Stages 7, 8, 9
- [ ] Record approvals in `PROGRESS.md` for Stages 2 and 4–9
- [ ] Book the midwife or pediatrician (checklist #10). Give them the lists after section 1 is done
- [ ] Write the native Polish red-flag list (`GateRules.swift` is a working draft)
- [ ] Verify phone numbers: PL 112 / 999 / 800 70 2222, US 911 / 988, UK 999 / 111 / 116 123, EU 112
- [ ] Write your 15 + 15 Stage 9 example messages (the current 30 were written by Claude)
- [ ] Start the Paid Applications Agreement (checklist #5); it blocks Stage 10 sandbox testing
- [ ] Turn on membership auto-renew before Dec 1 (membership ends Dec 9)
- [ ] Decide the app name (Open Question #1)
- [ ] Privacy policy, terms and support pages (checklist #7, #8)
- [ ] Collect ~20 beta testers (checklist #12)

## 4. Evals

- [ ] No `evals/results-*.md` exists, so the EN-only decision and prompt v2 have no baseline
- [ ] 40 questions, but 30 are note messages and only 2 are Polish. The plan calls for 50 real questions (25 pregnancy + 25 baby)
- [ ] Run the set and commit the first results before more prompt changes

## 5. Docs out of date

- [ ] `PROGRESS.md` has no Stage 8 entry
- [ ] `testing/STAGE8-TESTING.md` says "not committed" (it's in `e8d5247`)
- [ ] `PROGRESS.md` Stage 7 still refers to `STAGE7-TESTING.md` at its old location
- [ ] `PLAN.md` says the profile block is ≤150 tokens; the code allows ~190

## 6. Before TestFlight

- [ ] Replace the `fatalError` when the store can't open (`MomChat/App/MomChatApp.swift:21`) with an error screen
- [ ] Add `VersionedSchema`
- [ ] Polish: 1 of 363 strings translated
- [ ] Stage 9 known gaps: Polish messages rarely get a save card; a note only goes on the active twin
- [ ] Support lines for EU countries (none listed)

## 7. Not started

- [ ] **Stage 10, Paywall:** Keychain counter, `.storekit` file, entitlements, paywall screen, send lock. The emergency gate must never count or be locked
- [ ] **Stage 11, Privacy:** FaceID lock, app-switcher blur, encrypted backup, "delete everything", Settings content
- [ ] **Stage 12, PDF export**
- [ ] **Stage 13, Polish pass:** app icon, Dynamic Type at large sizes, VoiceOver, performance check
- [ ] **Stage 14, TestFlight**, with in-app feedback
- [ ] **Stage 15, App Store submission**

## Order

1. Section 1, then the loss flow in section 2
2. Phone scripts for Stages 7–9, then the eval set
3. Midwife review of the updated lists
4. Stage 10
