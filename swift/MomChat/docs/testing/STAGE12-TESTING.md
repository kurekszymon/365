# Stage 12: PDF Export — Hand-off and Phone Test

You can share any conversation as a PDF to hand to a doctor or midwife.

**Status (2026-11-12):** built and tested in the simulator, waiting for the phone test.
The build passes and all 11 new tests pass. Two `StoreKitFlowTests` still fail with `.notEntitled`, as they did before this stage (since `4171963`).

## What changed

- **What goes in the PDF** (`MomChat/Core/Export/ConversationReport.swift`), in the app's language:
  - **Header:** the chat's title and "Chat from 11 November 2026 at 22:32".
  - **Baby or pregnancy:** the facts, with the age or pregnancy week **on the day of the chat**, not today. Also corrected age, born early, delivery, feeding, allergies, conditions, medications, or for a pregnancy: due date, number of babies, what's being monitored.
  - **Saved from chats:** up to 5 of the most recent notes.
  - **Mom:** name, earlier births, conditions, medications, her saved notes.
  - **Questions and answers:** with times, and a date line when the day changes. Answers marked medical keep their footnote. Where an answer is missing, a line says whether the emergency screen opened or no answer came.
- **Drawing the PDF** (`MomChat/Core/Export/ConversationPDF.swift`):
  - Splits long chats across pages.
  - A4, or Letter on a phone set to US measurements.
  - Bold from answers stays bold; no `**` shows.
  - Every page ends with the on-device note and a page number like "1 / 2".
- **Sharing** (`MomChat/Features/Export/ConversationShare.swift`):
  - A Share button in the chat's top bar, next to History. It's greyed out until something is saved.
  - Long-press a chat in the history list → **Share as PDF**.
  - The PDF is only made when you pick where to send it. It's written with complete file protection to the app's temporary folder, and the previous one is deleted on each export.
- **Strings:** 33 new `export.*` keys in `Localizable.xcstrings` (English only). No inline literals.
- **Tests:** `ConversationReportTests` and `ConversationPDFTests` in `MomChatTests/ExportTests.swift` (11 tests).
- Small edits to `ChatView.swift` (Share in the toolbar) and `ConversationListView.swift` (long-press menu).

## Try this on your phone

1. Open a chat that has at least one answer. Tap **Share** (top left, next to History).
   → The share sheet opens with "Chat as PDF".
2. Choose **AirDrop** → your Mac (or *Save to Files*).
   → The file is called `MomChat Emma 2026-11-12.pdf` (`MomChat Chat …` when there's no baby name).
3. Open it on the Mac.
   → The baby or pregnancy details come first, then the questions and answers. Bold from answers is bold, with no `**`.
   → Every page ends with the on-device note and "1 / 2".
4. Start a new chat with nothing sent yet.
   → Share is greyed out.
5. Open the history list and long-press an older chat → **Share as PDF**.
   → Same PDF, without opening the chat.
6. Export a chat where the emergency screen opened.
   → In place of an answer: "This question opened the emergency screen, so no answer was written."
7. Export a pregnancy chat from a few weeks ago.
   → "Week when asked" shows the week on that day, not today's.
8. Switch the phone to Polish and export again.
   → Dates and weeks are in Polish; the labels stay English until the Polish keys are filled in.

Also check that the top bar (History, Share, title, New chat, Settings) isn't crowded on your phone.

## Choices to confirm

- **Mom's details are included** (name, earlier births, conditions, medications, her saved notes).
- **An ended pregnancy** shows its due date, the week when asked and "Status: Pregnancy ended". Its saved notes are left out, the same as in the prompt.
- **Only the age and week are for the day of the chat.** Feeding, allergies and notes show the profile as it is now.
- **Lists are joined with commas** ("low iron, placenta position check"), so two conditions don't read as one.
- **Paper size:** Letter on a phone set to US measurements, A4 everywhere else.

## Known gaps

- A "Question" label can end up alone at the bottom of a page (TextKit 1 has no keep-with-next).
- Polish for the 33 new keys. With the phone in Polish, dates and weeks are already Polish but the labels stay English.
- The toolbar layout hasn't been checked on a real screen.

## Sample PDFs

Two samples were made in the simulator during the build: a baby chat on A4 (with an emergency question) and a 3-page twin pregnancy chat on Letter. They were saved in a temporary folder, so they may be gone. To see a real one, export from the app (steps 1–3).

## Running the tests

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project MomChat.xcodeproj -scheme MomChat \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:MomChatTests test
```
