# MomChat — Progress

## Stage 0: Project Setup ✅ approved 2026-10-25

- Built: iOS 26.0 deployment target, Swift 6 language mode, iPhone only (no Mac/Vision "Designed for iPhone"), portrait only; folder structure under `MomChat/` (App, DesignSystem, Models, Core/_, Features/_, Resources); `Localizable.xcstrings` with EN + PL; Swift Testing check that the app ships `en` + `pl`; `.gitignore` for xcuserdata/DerivedData/build
- Feedback fixed: test runs were slow because of the template UI tests, so self-checks now run `-only-testing:MomChatTests`
- Deferred: empty folders aren't in git until they hold files (`.gitkeep` gets copied into the bundle by Xcode's synchronized groups); UI test target kept but not part of self-checks
- Decisions: bundle ID `com.kurek.MomChat`; project lives at `swift/MomChat/` with PLAN/IMPLEMENTATION/PROGRESS and `evals/` next to the `.xcodeproj`;
