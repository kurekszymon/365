# Stage 6: Real Chat — Testing Guide

Stage 6 is done when **the answers clearly use the profile, and nothing crashes on refusals**. Run this on your iPhone, then send back what's wrong, what feels off, or "Stage 6 approved".

---

## Already checked on the simulator

- The build is clean, and the build output shows no inline UI strings
- 103 unit tests pass (`-only-testing:MomChatTests`), including the new ones in `ChatTests.swift`: profile block (checked against the PLAN.md examples, plus a token-budget check), instructions budget, history pairing and cut-off, error mapping, titles, the 6-hour resume rule, search, and starter chips by stage
- **Not checked:** any real answer. Apple Intelligence is off on the Mac, so the model can't run in the simulator. Streaming, Stop, follow-ups and refusals need your phone

---

## What changed

**Prompt** (`Core/Prompting/`)
- `Instructions.swift`: the calm-midwife voice, always answering in English. It covers answer shape, a 3–6 sentence limit, plain text with light **bold**, the safety rules from PLAN.md, and today's date. About 500 tokens or fewer (a test enforces it). **Please read this file**: reviewing the prompt is your "You prepare" item
- `ProfileBlock.swift`: built from your real saved data in PLAN.md's format. It covers mom, pregnancy or child, corrected age, twins, other children, and the 5 newest notes. A fully filled profile stays under about 190 tokens
- `SessionPrompt.swift`: gathers the mom, twins and other children from the store

**Chat** (`Core/Inference/`, `Features/Chat/`)
- `ChatController`: one model session per chat. Answers stream into the bubble with three dots until the first word, and the send button turns into **Stop**
- Questions and answers are saved. A stopped answer keeps what had arrived
- When you reopen a chat, its saved turns are given back to the model (`ChatHistory`)
- Editing the profile or recording a birth refreshes the profile the model sees
- **Opening the app:** the latest chat comes back if you used it in the last 6 hours, otherwise you get a fresh chat. An empty chat isn't saved
- **Chats list** (list icon, top left): past chats for the current child, including the shared pregnancy chats for twins. It has search over titles and messages, a matching snippet under each result, and swipe to delete
- **New chat**: the pencil icon, top right
- **Starter chips**: 22 starter questions, shown on an empty chat. They change with the stage (1st, 2nd or 3rd trimester; newborn; 3–11 months; toddler), and newborns get an extra C-section chip if that's how the baby was born. A tap puts the full question in the input field so you can edit it before sending
- **Error messages** (`ChatFailure`): blocked or refused questions, unsupported language, a chat that's too long, the model being unavailable, and other failures each show a friendly message. Where it helps there's a **Try again** or **New chat** button

**Debug tools**
- The old hand-written spike prompt (`SpikePrompt`) is replaced by `EvalProfiles`, which uses the same prompt builder as the chat
- The question runner's report now records which prompt version it ran
- The language picker in the playground is gone, since answers are always English

**Strings**
- About 60 new catalog keys, English only. The old `chat.chip.*` keys are removed

---

## Try this on your phone

1. **Pregnant profile:** tap a starter chip, then send. The dots appear, the answer streams in and mentions the week where it matters
2. **Stop:** ask a long question and tap Stop halfway. The partial answer stays
3. **History:** force-quit and reopen the app. The same chat comes back with all its messages
4. **Follow-up:** ask "and what about at night?". The answer should use the earlier question
5. **Chats list:** tap the pencil for a new chat and ask something, then open the list and search a word from an older answer. The old chat appears with a snippet; tap it to reopen it
6. **Switch to a born child** (tap the title). The chips change to baby topics and the answers use the name and age
7. **Error message:** ask something likely to trip Apple's filter, like a breastfeeding or genital-rash question. You should see the friendly "I can't answer that one here…" message, not a crash
8. **Answer quality:** Settings → Developer → Question runner. Run English, export the results and send me the file so I can compare it with the Stage 2 baseline

---

## Known gaps

- Long chats aren't compacted yet; they show the "start a new chat" message. That's Stage 7
- Error messages aren't saved. If you reopen a chat after a refusal, the question shows with no answer under it
- The 6-hour rule is only checked at launch and when you switch child, not when the app comes back from the background
- For an archived pregnancy the model gets no profile at all. What it should be told is part of the Stage 8 loss work
- `evals/questions.json` holds 10 questions, not the 50 the plan calls for
- Polish for all the new keys is still to write
- The top bar now holds three buttons plus the title. Check that it doesn't feel crowded
