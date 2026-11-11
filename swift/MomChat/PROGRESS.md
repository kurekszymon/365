# MomChat — Progress

## Stage 0: Project Setup ✅ approved 2026-10-25

- Built: iOS 26.0 deployment target, Swift 6 language mode, iPhone only (no Mac/Vision "Designed for iPhone"), portrait only; folder structure under `MomChat/` (App, DesignSystem, Models, Core/_, Features/_, Resources); `Localizable.xcstrings` with EN + PL; Swift Testing check that the app ships `en` + `pl`; `.gitignore` for xcuserdata/DerivedData/build
- Feedback fixed: test runs were slow because of the template UI tests, so self-checks now run `-only-testing:MomChatTests`
- Deferred: empty folders aren't in git until they hold files (`.gitkeep` gets copied into the bundle by Xcode's synchronized groups); UI test target kept but not part of self-checks
- Decisions: bundle ID `com.kurek.MomChat`; project lives at `swift/MomChat/` with PLAN/IMPLEMENTATION/PROGRESS and `evals/` next to the `.xcodeproj`;

## Stage 1: First App Shell ✅ approved 2026-10-26

- Built: design tokens (`Palette` light/dark, Dynamic Type `Typography`, `Spacing`/`Radius`); `RootView` switching onboarding placeholder → chat on a hardcoded flag; static chat (Week 24 / 2nd trimester header, disclaimer, fake bubbles, quick-action chips, growing input bar, send appends a local bubble); empty Settings sheet; all 21 visible strings in `Localizable.xcstrings` with translator comments
- Feedback fixed: first warm amber palette felt "AI-ish" → rebuilt from the user's Figma colors (taupe #C9AC9C, mauve #B38093, lavender grey #DDD5DD, sage #B0D4B4), all text pairs ≥4.5:1; Settings title unreadable in dark mode (caused by a light/dark swap in `Color(light:dark:)`, now restored)
- Deferred: Polish translations for all Stage 1 strings (→ before Stage 4 / Stage 13); sage chips stand out a bit much, tone down later; large Dynamic Type sizes not checked (→ Stage 13)
- Decisions: palette from the user's Figma swatches (mauve accent, taupe user bubbles, sage chips); colors defined in code, not the asset catalog (only AccentColor lives there); `xcodebuild` doesn't sync the String Catalog, so keys are added by hand and checked against the compiler's extracted strings

## Stage 2: Model Spike — committed 2026-10-27 (`cde6161`), approval not logged

- Built: `ModelAvailability` gate before onboarding (not enabled / downloading / not eligible screens, rechecked on foreground, *Skip (debug)* in debug builds); Developer tools → model info, guardrail + answer-length settings, streaming playground with 6 hand-written profiles, question runner over `evals/questions.json` with timing, token count, refusals and export; `evals/README.md` + a 10-question template (symlinked into the app)
- Deferred: the real 50 questions (checklist item 9); Polish for the new strings. Debug code and `questions.json` are now kept out of Release
- Decisions: **go EN-only for now** (2026-10-29, also logged under Stage 3)

## Stage 3: Data Models + Date Logic ✅ approved 2026-10-28

- Built: SwiftData models `MomProfile`, `Child` (stage/sex/delivery/feeding enums, `multiples`, `multipleBirthID`), `Conversation` + `Message`, `ProfileNote`, with cascade deletes; `DataStore` in its own `Application Support/Store/` folder with `.complete` file protection, excluded from backup, CloudKit off, opened lazily (prewarm before first unlock); `Core/Dates`: due date from last period, pregnancy week + trimester, age (days → weeks → months → years), corrected age, EN + PL text; `Child.recordBirth` splits a multiples pregnancy into one child per baby; Developer tools → *Dates & storage* screen; 25 new tests (36 total)
- Feedback fixed: twins/triplets can't share one born profile → birth split built now, form planned in Stage 5; no upper limit on `multiples`
- Deferred: birth form + earlier banner for multiples, whether pregnancy conversations show under siblings (→ Stage 5); copy for fewer babies than expected (→ Stage 8, midwife review); "0 days" for a baby born today (→ Stage 4/5 header); trimester label (→ Stage 4, String Catalog); store-open failure is a `fatalError` (→ schema lock + error screen before Stage 14)
- Decisions: Polish plurals come from Foundation's `DateComponentsFormatter` (CLDR), not hand-written rules; corrected age only for babies born before 37w0d, until 24 months chronological; last-period date not stored; `sex = nil` means unknown; no speculative model fields — additive changes migrate automatically until TestFlight, `VersionedSchema` before Stage 14
- Stage 2 decision (2026-10-29): **go EN-only for now**. Model answers in English; Polish UI strings keep going into the String Catalog but don't block any stage

## Stage 4: Onboarding — committed 2026-10-29 (`fb6e2bd`, follow-ups `f1e7ded`, `aa3c9a2`), approval not logged

- Built: welcome → device check → "Where are you right now?" → pregnancy / birth details → "You have 20 free questions" → chat; nothing saved until the last step; one `Child` per baby for born multiples (shared `multipleBirthID`), `multiples = n` while expecting; `ChatHeader` ("Week 24 · 2nd trimester", "Emma · 7 months", "Baby · born today", corrected-age subtitle); stage-dependent chips; `MomProfile.activeChild`; `PrimaryButton`; Developer tools → delete all data and restart onboarding; every UI string moved to keyed catalog entries
- Open questions from the hand-off (answers not logged): "Both" opens on the pregnancy; "First pregnancy? → No" saved as 1 earlier birth; twin pregnancies skip name/sex; birth date without time
- Deferred: Polish for all keys; free-questions counter (→ Stage 10); FaceID slot (→ Stage 11); "Born early" toggle and dark mode not checked in the simulator

- Required fields: Expecting = due date **or** first day of last period. Baby is here = birth date. Both = both. Everything else optional: number of babies (default 1, no upper limit), first pregnancy?, baby name (nil = "Baby"), born early + weeks early (due date = birth + weeks), sex, delivery type, feeding, allergies/conditions, what the doctor is watching. "Both" skips "first pregnancy?"
- Validation: due date from ~2 weeks ago to 40 weeks ahead; birth date not in the future, not more than 3 years ago
- Corrected age confirmed: only for babies born before 37w0d
- Out of scope: FaceID step (→ Stage 11, leave a slot in the flow); free-questions counter + paywall (→ Stage 10)
- Monetization changed (2026-10-30): **no payment step in onboarding and no free trial**. 20 free questions per phone (Keychain counter, emergency gate never counts), then the paywall with monthly / yearly / lifetime
- Copy: Claude writes English and adds every key to the catalog; the user writes Polish natively (Stage 1–2 Polish also still missing)
- Strings (2026-10-30): **no inline literals in app code**. Every user-facing string is a dotted catalog key (`onboarding.welcome.title`) with the English as its value, used through generated symbols (`Text(.onboardingWelcomeTitle)`). The same word in different contexts gets separate keys. Developer tools stay plain English. Check: after a build, `.stringsdata` only lists `GeneratedStringSymbols_Localizable`

## Stage 5: Profiles Screen — committed 2026-10-31 (`85523e2`), approval not logged

- Built: `ProfilesView` (opened from the chat header and Settings), switching the active child, `MomEditView` / `ChildEditView` for every field, `AddChildView`, `BirthBannerView` + `BirthFormView` (one block per baby for multiples, via `Child.recordBirth`), archive flow; `Child+Profiles` helpers; `ProfilesTests`
- Note: `MomChatUITests/Stage5Throwaway.swift` was committed with this stage, though throwaway UI tests are meant to stay out of git

- Birth banner: from 37w0d for a singleton, **34w0d for twins, 32w0d for triplets or more**. Also reachable by hand from the profile at any time (early births)
- Pregnancy conversations after a multiple birth: they stay on the first baby's record (Stage 3), and **every sibling's history shows them too** (found through the shared `multipleBirthID`)
- The profiles screen opens from **both** the chat header (tap the title) and Settings
- Ending a pregnancy: it moves to `.archived` and **its history is kept by default**. Deleting it is a separate, explicit action. Loss copy is finalized in Stage 8 (midwife review)

## Stage 6: Real Chat — committed 2026-11-01 (`4203bfb`), approval not logged

- Built: `Instructions` (calm-midwife voice, English answers, 3–6 sentences, safety rules, ≤500 tokens, test-enforced) + `ProfileBlock` from saved data (≤~190 tokens) + `SessionPrompt`; `ChatController` with one streaming session per chat and Stop; saved questions/answers fed back via `ChatHistory`; profile edits refresh the prompt; 6-hour resume rule; chats list with search and swipe-to-delete, shared pregnancy chats for twins; 22 stage-dependent starter chips; `ChatFailure` error mapping; `EvalProfiles` replaces `SpikePrompt`, runner reports the prompt version
- Deferred: refusals aren't saved (a reopened chat shows the question with no answer); 6-hour rule not checked on return from background; what the model is told for an archived pregnancy (→ Stage 8); 10 eval questions instead of 50; Polish for new keys; check the top bar isn't crowded

## Stage 7: Context Management — built 2026-11-02 (`673b67a`), waiting for the phone test

- Built: `ContextBudget` (window from `SystemLanguageModel.contextSize`, 600 answer / 0 tools / 250 summary reserve, exact tokenizer on iOS 26.4+, ~3 chars/token estimate before that); `Compactor` folds the oldest turns into ≤250-token notes saved on `Conversation` (`summary`, `summarizedMessageCount`), newest turns kept up to 40% of history room; silent full compaction + one retry on `exceededContextWindowSize`; "too long" message only for a single oversized message; token overlay and *Pretend context is…* in Developer tools; testing guide in `STAGE7-TESTING.md`
- Not yet checked: real compaction and token counts (Apple Intelligence is off on the Mac)
- Known gaps: summarizer output isn't measured exactly before use; a single message over ~2,500 tokens can't be answered

## Small fixes between stages

- 2026-11-04 (`3294a5c`): never show "0 days": "Due date today" header subtitle for a preterm baby on the original due date, "born today" / "due date today" in the profile block (closes the Stage 3 deferred item)
- 2026-11-05 (`c1af5a6`): softer sage starter chips, contrast still ≥7:1 (closes the Stage 1 deferred item)
- 2026-11-06: refusals and other failures are saved on the question (`Message.failureReason`, additive), so a reopened chat still explains an unanswered question; the latest one keeps Try again (closes the Stage 6 known gap). Removed the committed `Stage5Throwaway.swift` UI test
- 2026-11-07: the 6-hour rule also runs when the app comes back from the background (not while an answer streams or with unsent text); a notice in the new chat says why and offers "Continue that chat" (closes the Stage 6 known gap)

## Stage 9: Profile Memory — built 2026-11-08, waiting for the phone test

- Built: `proposeProfileUpdate` tool that only fills an inbox; `ProposalFilter` (must share a word with her message, no repeats, ≤60 characters); Save / Dismiss card under the answer, kept on `Message` (additive fields) so it survives a reopen; `ProfileNotes.save`, called only from Save; "Saved from chats" section to edit and delete notes on child, pregnancy and mom; 150-token tool reserve; eval runner uses the tool, `expectsNote` scores false and missed cards, 30 note messages written by Claude; guide in `docs/testing/STAGE9-TESTING.md`
- Not yet checked: real tool behaviour, false-proposal rate and any speed change (Apple Intelligence is off on the Mac; the user will check speed later)
- Decisions: no card for grief or crisis messages, questions sent on from an emergency card, stopped or failed answers, or ended pregnancies; an ended pregnancy's notes leave the prompt; one card per answer
- Known gaps: Polish messages rarely get a card (the word check compares Polish with an English note); a note goes only on the active twin; Polish for 9 new keys

## Stage 11: Privacy — built 2026-11-11, waiting for the phone test

- Built: optional `AppLock` (Face ID, passcode fallback; asked before turning it on or off; locks on background, asks once on return; emergency number on the lock screen); privacy cover whenever the app isn't active; encrypted backup (`BackupArchive` → JSON → LZFSE → AES-GCM, key from PBKDF2-SHA256 600k via CommonCrypto, authenticated header); restore from Settings (replaces, after confirming) and from the welcome screen; `DataWipe` for "Delete everything" and the Developer reset; Settings sections Plan (manage subscription, restore purchases), Privacy (lock, back up, restore, "How your data is kept"), Delete everything; onboarding lock step; `NSFaceIDUsageDescription` + `InfoPlist.xcstrings`; 4 new test suites in `PrivacyTests.swift`; guide in `docs/testing/STAGE11-TESTING.md`
- Decisions: lock off by default and locks immediately (no grace period); cover always on, even without the lock; the lock setting, free-question count and purchases aren't in the backup; "Delete everything" keeps the free-question count; new screens in `Features/Privacy/`
- Known gaps: privacy policy / terms / support rows hidden until `AppLinks` has URLs; the SQLite file isn't compacted after "Delete everything"; Polish for 73 new keys; `set: setLock` in `SettingsView` crashed the Swift 6.3 compiler, so it's a closure (commented)
- Test status: 2 `StoreKitFlowTests` fail with `.notEntitled`, already failing at `4171963`
