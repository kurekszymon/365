# Stage 11: Privacy — Phone Test

Run from Xcode with the **MomChat** scheme on your iPhone. Apple Intelligence isn't needed for anything here except the chat itself.

In the simulator, Face ID is under *Features → Face ID*: tick **Enrolled**, then use **Matching Face** / **Non-matching Face** when the prompt shows.

## Script

| # | Do this | Expected |
|---|---|---|
| 1 | Settings | Sections: Profiles · Plan (free count or Full access, *See plans* or *Manage subscription*, *Restore purchases*) · Privacy (*Lock with Face ID* toggle, *Back up to a file*, *Restore a backup*, *How your data is kept*) · *Delete everything* |
| 2 | Turn on *Lock with Face ID* | iOS asks for Face ID permission the first time, then Face ID. Toggle stays on. Cancel instead: toggle stays off |
| 3 | Swipe up to the app switcher | MomChat's card shows a lock-shield icon, no chat |
| 4 | Go to the Home Screen, open MomChat again | "MomChat is locked", Face ID asks once by itself. Cancel it: no second prompt; *Unlock with Face ID* asks again. Your emergency number is at the bottom (112 in Poland) and calls without unlocking |
| 5 | Settings → *Back up to a file*. Type a 5-letter password, then 8+ characters twice and *Create backup* | With 5 letters: "Use at least 8 characters.", *Create backup* stays grey. Then a short spinner and *Save or send the backup*. Save to Files (or AirDrop to your Mac) |
| 6 | Settings → *Restore a backup*, choose that file, type a **wrong** password, *Restore*, confirm | "That password doesn't open this backup…". Nothing on the phone changed |
| 7 | Delete the app, reinstall from Xcode. On the welcome screen tap *Moving from another phone? Restore a backup*, choose the file, right password | The chat opens with your profiles, saved notes and every chat back, in the same order. The lock is **off** (it isn't in the backup) |
| 8 | Settings → *Delete everything* → confirm | Back to the welcome screen. Settings lock is off. The free-question count didn't reset |
| 9 | Go through onboarding again | A new step after the details: "Keep your chats private", *Turn on Face ID* / *Not now*. Choose Face ID: after *Start asking*, leaving and reopening the app asks for Face ID |
| 10 | Settings → *How your data is kept* | Six short points. **Is anything there untrue or unclear?** |

## Things to tell me

- Does the cover in step 3 also showing briefly behind Face ID and Apple's purchase sheet bother you?
- Should the app lock straight away when you leave (now) or after a short grace period, e.g. 1 minute?
- Is the restore link on the welcome screen easy enough to find for someone on a new phone?

## Not in this stage

- The privacy policy, terms and support rows are hidden until those pages exist. Fill in `AppLinks` in `MomChat/Features/Privacy/PrivacyInfoView.swift` (checklist #7, #8)
- Polish for the 73 new keys

## Running the tests from the command line

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project MomChat.xcodeproj -scheme MomChat \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:MomChatTests test
```

New suites: `AppLockTests`, `BackupCryptoTests`, `BackupArchiveTests`, `DataWipeTests` (in `PrivacyTests.swift`).
