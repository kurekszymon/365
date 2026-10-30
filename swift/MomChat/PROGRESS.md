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

## Stage 3: Data Models + Date Logic ✅ approved 2026-10-28

- Built: SwiftData models `MomProfile`, `Child` (stage/sex/delivery/feeding enums, `multiples`, `multipleBirthID`), `Conversation` + `Message`, `ProfileNote`, with cascade deletes; `DataStore` in its own `Application Support/Store/` folder with `.complete` file protection, excluded from backup, CloudKit off, opened lazily (prewarm before first unlock); `Core/Dates`: due date from last period, pregnancy week + trimester, age (days → weeks → months → years), corrected age, EN + PL text; `Child.recordBirth` splits a multiples pregnancy into one child per baby; Developer tools → *Dates & storage* screen; 25 new tests (36 total)
- Feedback fixed: twins/triplets can't share one born profile → birth split built now, form planned in Stage 5; no upper limit on `multiples`
- Deferred: birth form + earlier banner for multiples, whether pregnancy conversations show under siblings (→ Stage 5); copy for fewer babies than expected (→ Stage 8, midwife review); "0 days" for a baby born today (→ Stage 4/5 header); trimester label (→ Stage 4, String Catalog); store-open failure is a `fatalError` (→ schema lock + error screen before Stage 14)
- Decisions: Polish plurals come from Foundation's `DateComponentsFormatter` (CLDR), not hand-written rules; corrected age only for babies born before 37w0d, until 24 months chronological; last-period date not stored; `sex = nil` means unknown; no speculative model fields — additive changes migrate automatically until TestFlight, `VersionedSchema` before Stage 14
- Stage 2 decision (2026-10-29): **go EN-only for now**. Model answers in English; Polish UI strings keep going into the String Catalog but don't block any stage

## Stage 4: Onboarding (decisions made, not started)

- Required fields: Expecting = due date **or** first day of last period. Baby is here = birth date. Both = both. Everything else optional: number of babies (default 1, no upper limit), first pregnancy?, baby name (nil = "Baby"), born early + weeks early (due date = birth + weeks), sex, delivery type, feeding, allergies/conditions, what the doctor is watching. "Both" skips "first pregnancy?"
- Validation: due date from ~2 weeks ago to 40 weeks ahead; birth date not in the future, not more than 3 years ago
- Corrected age confirmed: only for babies born before 37w0d
- Out of scope: FaceID step (→ Stage 11, leave a slot in the flow); free-questions counter + paywall (→ Stage 10)
- Monetization changed (2026-10-30): **no payment step in onboarding and no free trial**. 20 free questions per phone (Keychain counter, emergency gate never counts), then the paywall with monthly / yearly / lifetime
- Copy: Claude writes English and adds every key to the catalog; the user writes Polish natively (Stage 1–2 Polish also still missing)
