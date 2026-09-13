# What is true at easywed v1

Section 3 of the `video-plan` skill. Confirmed selling points — **this is the whole pool of real
material** a video may draw on. Anything not here or in the skill's section 2 reading is not
established; check it before it reaches a brief, and check it against the do-not-claim list in
`SKILL.md` section 4, which is where the near-misses live.

Written against the `easywed/v1` tag. When the product is tagged past v1, this file and the tag
named in section 2 both need updating — nothing will warn you.

- **The full planner with no account at all.** `/wedding/local` auto-seeds a hall; there is nothing
  to sign up for, no email, no wall. `PUBLIC_PATHS` in `AuthGate.tsx` lists it; it deliberately has
  no `requireAuth` in `beforeLoad`.
- **Free for couples**, stated contractually rather than as a promotion — `terms.fees.c1`.
- **A metric, to-scale floor plan** — `PX_PER_M = 60`, a measuring tool (`measure.*`), snapping
  (`canvas.snap.*`), a 1 m ruled grid with a firmer 5 m ruling.
- **Multi-hall and multi-floor** (`hall.floor`, `hall.list_title`), plus custom polygon halls and
  fixtures — stage, dance floor, bar, DJ booth, entrance, or a shape drawn by hand
  (`fixtures.preset.*`, `fixtures.shape.polygon`).
- **CSV and XLSX import** through a column-mapping wizard that survives Polish diacritics, reports
  skipped and overflowed rows, and can seat guests from a table column — `guests_imported`,
  `guests.import.*`, changelog `i3`.
  - How the wizard actually runs (`dialogs/guests/ImportGuestsDialog.tsx`,
    `lib/import/guestsImport.ts`): file → mapping → preview → commit. `autoDetectMapping`
    pre-fills the four fields (`name`, `table`, `dietary`, `note`) from Polish or English headers
    after `normalize` strips diacritics and maps `ł` → `l` (*Gość*, *Stół*, *Dieta*, *Uwagi* all
    match). Table names join to existing tables through the same `normalize`, and only while the
    table has capacity left — the rest count as `overflowed`. *„Do zaimportowania: N gości”*
    (`guests.import.summary`) sits on the **preview** step after *Dalej*, not on the mapping step.
    On a phone the dialog is a bottom-sheet drawer (`ui/responsive-dialog.tsx`).
  - `guests.import.drop_here` is *„Przeciągnij tutaj plik .csv lub .xlsx lub kliknij, aby
    wybrać”*; the progress card is `guests.progress` *„Rozsadzeni”* beside
    `guests.seated_ratio` *„{{seated_count}}/{{count}} gości przy stołach”* — two strings, not
    *„Rozsadzeni 58/58”*.
- **A printable plan and guest list** — the venue/kitchen report, with diets and headcount.
  `plan_printed`, `export.pdf.*`, changelog `i6`. It is the browser print dialog, not a generated
  file; see section 4.
- **Invite-link collaboration** with owner / editor / viewer roles — `members.role.*`,
  `invite_claimed`. **Account-gated:** `canInvite = Boolean(session) && !isLocalWedding(weddingId)`,
  so a guest-mode video cannot show this without saying so.
- **BYO-key AI** that can add, move and update tables, fixtures and halls, and can run against a
  local model — `ai_chat_message_sent`, `assistant.setup.llamacpp_*`. The key is the user's own.
- **Privacy posture**: PostHog autocapture off, no cookie banner because there are no cookies to
  consent to, and no guest name ever reaches analytics. The comment at the top of `track.ts`
  explains why the event map is closed; it is the best evidence for this claim.

## Guest mode vs. account, at a glance

`docs/guest-vs-account.md` at the tag is the authority. The short version for video purposes —
everything a brief is likely to show works signed out **except** the last four rows:

| shown in a video | guest | signed in |
| --- | :---: | :---: |
| halls, tables, fixtures, seating | ✅ | ✅ |
| guest list, CSV/XLSX import & export | ✅ | ✅ |
| print / PDF export | ✅ | ✅ |
| AI assistant (own key) | ✅ | ✅ |
| reminders | ✅ | ✅ |
| **inviting members** | ❌ | ✅ |
| **multiple weddings** | ❌ | ✅ |
| **sync across devices** | ❌ | ✅ |
| **roles (editor / viewer)** | ❌ | ✅ |
