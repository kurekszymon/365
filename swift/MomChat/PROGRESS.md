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
