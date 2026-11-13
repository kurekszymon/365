# Stage 14: TestFlight

Getting a build onto testers' phones, and what to check first.

## ⚠️ Before external testers (real moms)

Internal testing (you, plus anyone on your App Store Connect team) can start now. **External testers should wait** until these are done, because they are pregnant women and new moms relying on the safety screen:

- [ ] Midwife or pediatrician approval of the red-flag lists and emergency copy (Stage 8, checklist #10)
- [ ] The phone numbers checked: PL 112 / 999 / 800 70 2222, US 911 / 988, UK 999 / 111 / 116 123, EU 112
- [ ] Privacy policy URL (TestFlight requires it for external testing)
- [ ] `AppLinks.supportEmail` set (`MomChat/Features/Privacy/PrivacyInfoView.swift`), so Send feedback appears
- [ ] A real app icon (the current one is a placeholder)

## One-time setup in App Store Connect

1. **Apps → + → New App**: iOS, name (Open Question #1), primary language English, bundle ID `com.kurek.MomChat`, SKU e.g. `momchat`.
2. **Subscriptions** (if not done in Stage 10): group + `com.kurek.MomChat.monthly`, `.yearly`, and the in-app purchase `com.kurek.MomChat.lifetime`. They must be "Ready to Submit" to be bought in TestFlight. Needs the Paid Applications Agreement (checklist #5).
3. **TestFlight → Test Information**: paste from `docs/testflight/TESTFLIGHT-NOTES.md`.
4. **Encryption question.** Every upload asks "Does your app use encryption?". The backup file is encrypted with Apple's CryptoKit (AES-GCM), so the answer is **yes**. Whether it qualifies for the standard exemption is your legal declaration to make; Apple's export-compliance help explains the options. Once you know the answer, I can set `ITSAppUsesNonExemptEncryption` in the build settings so it stops asking.

## Each upload

1. In Xcode, select the **MomChat** target → General → raise **Build** by one (1 → 2 → 3). Version stays 1.0 until release. App Store Connect rejects a build number it has already seen.
2. Destination: **Any iOS Device (arm64)**.
3. **Product → Archive.** The Organizer opens when it's done.
4. **Distribute App → App Store Connect → Upload**, with automatic signing.
5. Wait for the "processed" email (5–30 min), then answer the encryption question.
6. Internal testers get it straight away. For external testers, add the build to a group; the first build goes through Beta App Review (usually within a day).

## Try this on your phone (from TestFlight)

| # | Do | Expect |
|---|---|---|
| 1 | Look at the home screen, in light mode, dark mode, and tinted (long-press the home screen → Edit → Customize) | The bubble-and-heart icon in all three, no blank square |
| 2 | Install the TestFlight build over your development build | Your profile and chats are still there (the store now has a version; your existing data opens as version 1) |
| 3 | Settings | No Developer tools section. No Send feedback row yet (it appears once the support email is set) |
| 4 | Ask a few real questions | Answers stream as they do in development; note how long the first word takes |
| 5 | Use up the free questions (20) and buy yearly with your sandbox account | Apple's sheet says [Sandbox] or [Environment: Sandbox], no charge; sending unlocks |
| 6 | Settings → Restore Purchases | "Your purchase is restored." |
| 7 | Take a screenshot in the app | TestFlight offers Share Beta Feedback |

To check Send feedback before the real address exists, temporarily set `AppLinks.supportEmail` to your own address in a development build: tapping it should open a draft in your mail app, with app version, iOS, iPhone model and language at the bottom, and nothing about chats or profile.

## Collecting feedback (2 weeks)

Each week, write down:
- answers flagged as wrong, cold, too long → add them to `evals/questions.json`
- guardrail refusals on normal questions
- the emergency screen opening when it shouldn't, or not opening when it should → add to `SafetyTests.swift`
- crashes: App Store Connect → TestFlight → Crashes, or Xcode → Organizer → Crashes
