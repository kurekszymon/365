# Stage 7: Context Management — Testing Guide

Stage 7 is done when **no context error ever reaches the user**. Run this on your iPhone, then send back what's wrong, what feels off, or "Stage 7 approved".

---

## Already checked on the simulator

- The build is clean, and the build output shows no inline UI strings
- 130 unit tests pass (`-only-testing:MomChatTests`). The 15 new ones cover: the budget against the PLAN.md table, which turns get compacted and how much room is left afterwards, the overflow retry compacting everything, a huge question not crashing the planner, history starting after the summary, the summarizer prompt and clipping, long old chats split into summarizer calls that each fit, and the instructions with and without a summary
- **Not checked:** any real compaction. Apple Intelligence is off on the Mac, so the summarizer and the token counts need your phone

---

## What changed

**Budget** (`Core/Inference/ContextBudget.swift`)
- The window comes from `SystemLanguageModel.contextSize` (4096 today). 600 tokens are kept for the answer, 0 for tools (Stage 9 sets 150), and 250 for the summary
- Before every question the app measures instructions + profile + summary, the history and the question. On iOS 26.4+ it uses the model's own tokenizer (exact). Older versions use a deliberately high estimate (~3 characters per token)

**Compaction** (`Compactor.swift`, `ChatController.swift`)
- If the prompt won't fit, the oldest turns are turned into short notes with one extra model call (greedy, ≤250 tokens, at most 120 words of bullets). The newest turns are kept word for word, using up to 40% of the history room, so several more questions fit before the next compaction
- The notes are saved on the conversation (`summary`, `summarizedMessageCount`, both new additive fields), so a reopened chat starts from them too. A fresh session gets them in its instructions under "Earlier in this chat"
- **Every message stays on screen and in search.** Only what the model sees changes
- If the summarizer refuses (guardrail), those turns are dropped and the previous notes stay. That loses some memory but never shows an error
- A long chat saved in Stage 6 is folded in over several summarizer calls the first time you write in it, so that first answer is slower

**Silent retry**
- If the model still throws `exceededContextWindowSize`, the whole history is compacted, any half-written answer is discarded, and the question is asked once more. You only see the three dots for a bit longer
- The "chat too long" message is now only possible when **one message** is too big to fit. Its copy now says so ("That message is too long for me to read in one go…"), and the New chat button is gone (`chat.failure.newChat` removed)

**Prompt:** the main prompt text is unchanged for single questions, so the eval set runs exactly the same prompt (version 1). The summary section only appears in long chats

**Debug tools** (Settings → Developer tools → Context)
- **Token overlay in chat:** a small black label at the top right of the chat, e.g. `ctx 2310 / 4096 · S · C1` (prompt + answer reserve / window, S = has a summary, C = compactions). Tap it for the breakdown, the last event (e.g. "compacted 6 turns in 1 call(s) → ≈90 tok summary (2.1s)") and the current notes
- **Pretend context is…** 1500 / 2000 / 2500 / 3000 tokens. Compaction then happens after a few questions instead of about 30 messages. The real model still has its full window

---

## Try this on your phone

1. **Turn on the overlay:** Settings → Developer tools → *Token overlay in chat*. Start a new chat and ask a question. The label shows about 1300–1500 / 4096 after the first question
2. **Watch it grow:** ask 3–4 follow-ups. The number goes up after each one and `C0` stays
3. **Force a compaction:** Developer tools → *Pretend context is* 2000. Go back to the chat and ask 2–3 more questions. The dots last a bit longer once, then the label shows `S · C1`. Tap it: the event line says what was compacted, and the notes appear below
4. **Memory check:** ask something that relies on an early message ("what did I say she ate on Monday?"). The answer should still know it, from the notes
5. **Reopen:** force-quit and reopen. The chat comes back with every message visible, and the overlay still shows `S` after the next question
6. **The real thing (your "You prepare" item):** set the pretend size back to *Real*, then have one long conversation of 30+ messages with real follow-ups. No error should appear, and it should still remember what matters (the child's symptoms, what you tried, what was advised)
7. **Search:** in the chats list, search a word from the first messages of that long chat. It's still found

---

## Known gaps

- The notes are written by the same small model. They may lose details or phrase things oddly; please paste any bad notes you see into the reply (tap the overlay to read them)
- The summarizer's answer isn't counted exactly before it's used; it's capped at 250 tokens and the budget keeps 250 for it
- One message on its own longer than ~2,500 tokens (~10,000 characters) still can't be answered. It shows the new "too long" message instead of crashing
- No answer-quality report this stage: single-question answers use the unchanged version-1 prompt, so the Stage 6 eval results still apply. Summaries are only judged by your long-chat test (step 6)
