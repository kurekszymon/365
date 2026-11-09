# Stage 10: Paywall — Phone Test

Run from Xcode with the **MomChat** scheme. It now uses `MomChat.storekit`, so purchases are simulated and nobody is charged.

First check *Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration* shows **MomChat.storekit**.

Developer tools are in *Settings → Developer tools → Free questions*.

## Script

| # | Do this | Expected |
|---|---|---|
| 1 | Set used to **0**. Open the chat | No allowance line above the input. Settings shows "20 free questions left" and *See plans* |
| 2 | Set used to **15**, back to the chat | "5 free questions left" above the input. Tapping it opens the paywall |
| 3 | On the paywall, check every part, then tap *Close* | Headline matches the profile, 3 benefits, Yearly selected with $29.99, Monthly and Lifetime, *Continue*, *Restore*. Close goes back to the chat |
| 4 | Set used to **19**. Ask a normal question | "1 free question left" before sending. The answer finishes in full, then the paywall opens. **Does it feel too abrupt?** |
| 4a | On that paywall tap *Not now*, then ask again. Repeat until *Not now* is gone | "1 free question left" after each skip. *Not now* appears 3 times, so 23 questions in total |
| 5 | Set used to **Locked, no skips left**. Type a normal question, send | Paywall opens with no *Not now*. Your text is still in the field, nothing is added to the chat. Close it: history scrolls and reads normally |
| 6 | Still locked, send `baby not breathing` (baby profile) or `krwawię w 20 tygodniu` (pregnant profile) | Emergency card, no paywall. Developer tools still shows 23 used |
| 7 | Still locked, send `I feel hopeless and I can't cope` | An answer with the support card, no paywall, count unchanged |
| 8 | Tap the "used up" line, buy **Yearly** | Apple's sheet, then the paywall closes. Line is gone, questions send, Settings shows "Full access", count stays at 23 |
| 9 | Xcode: *Debug → StoreKit → Manage Transactions*, expire the subscription, then leave and reopen the app | Locked again, history still readable |
| 10 | Buy **Lifetime** | Same as step 8. In Manage Transactions, delete it: locked again after reopening the app |
| 11 | Delete the app and reinstall from Xcode, go through onboarding | The last step matches the counter (locked with no skips left: "Your free questions are used up"). The count survived |
| 12 | Tap *Restore* with no purchases | "No earlier purchase found for this Apple Account." |

Step 11 needs a purchase-free state: remove transactions in Manage Transactions first. They may not survive a reinstall.

## Sandbox (after the Paid Applications Agreement is active)

Set the scheme's StoreKit Configuration to **None**, create the 3 products in App Store Connect with these IDs, and repeat steps 8–10 with a sandbox tester:

- `com.kurek.MomChat.yearly`
- `com.kurek.MomChat.monthly`
- `com.kurek.MomChat.lifetime`

Put both subscriptions in one group, add no introductory offer, and turn on Family Sharing for all three.

## Running the tests from the command line

Simulator purchases need a debug entitlement, which `xcodebuild` doesn't add when no team is set. Without it the three StoreKit purchase tests fail with `.notEntitled` or an empty product list. Running them from Xcode with your team selected should not need this. From the command line, pass a plist containing `get-task-allow = true`:

```
xcodebuild test -project MomChat.xcodeproj -scheme MomChat \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:MomChatTests \
  CODE_SIGN_ENTITLEMENTS=/path/to/dev.entitlements CODE_SIGN_IDENTITY=-
```
