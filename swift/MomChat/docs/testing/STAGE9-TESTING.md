# Stage 9: Profile Memory — Overview, Testing and Tweaking

Status (2026-11-08): built, unit tests pass, **not approved and not committed**. The model's real tool behaviour is untested, because Apple Intelligence is off on the Mac.

## What Stage 9 does

```
She sends a message → the model answers, and may call proposeProfileUpdate
  └─ the tool only puts the suggestion in an inbox (it can't reach the store)
       └─ answer finished → ProposalFilter
            ├─ rejected → no card
            └─ accepted → card under the answer: Save / Dismiss
                  ├─ Save → ProfileNote created, next answer's profile block includes it
                  └─ Dismiss → hidden, not offered again in this chat
```

### When there's never a card

- The answer was stopped, failed, or never arrived
- The question was sent on from an emergency card ("this isn't happening right now")
- Her message matched grief or mental-health support
- The pregnancy has been ended (the session has no tool at all, and its notes leave the prompt)
- The fact shares no meaningful word with her message, or is already in the profile or was already offered in this chat
- The fact is over 60 characters or is phrased as a question

## Where things live

| To change | File |
|---|---|
| When the model should propose (tool description, argument guides) | `MomChat/Core/Memory/ProposeProfileUpdateTool.swift` |
| What code rejects | `MomChat/Core/Memory/ProposalFilter.swift` |
| Saving and dismissing | `MomChat/Core/Memory/ProfileNotes.swift` |
| The card | `MomChat/Features/Chat/ProfileNoteCard.swift` |
| Notes in the profile | `MomChat/Features/Profiles/ProfileNotesSection.swift` |
| Tests | `MomChatTests/MemoryTests.swift` |

## Measuring false proposals

Add your ~15 "should save" and ~15 "shouldn't save" messages to `evals/questions.json` with `"expectsNote": true` or `false` (four samples, `note-en-*`, are already there). Run them in Developer tools → Question runner. The report's header counts false and missed cards, and the `Note` column shows each result.

The tool's description is the first thing to tune if the numbers are bad.
