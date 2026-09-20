# The voice easywed writes in

Every user-facing string in this repo - the landing page, `/venues`, and all of
`src/i18n/locales/{en,pl}.json` - is judged against this file. Terms, privacy
and the legal prose are out of scope: they are drafted for a different reason
and reviewed separately.

## The model

**`src/i18n/locales/changelog/v1/{en,pl}.json`.** It is the most human text in
the repo, and it is what the rest should sound like. What it does right:

- concrete nouns instead of categories - the dance floor, the bar, the florist,
  the kitchen, vegan and gluten-free written next to the names;
- second person, talking to the couple about their own evening;
- it says what happens: _"drag a guest onto a seat"_, _"the progress bar keeps
  reminding you how many people are still standing"_;
- it admits limits in the same breath as the feature: _"guest mode keeps the
  plan on your device"_.

When a string is hard to write, find the sentence in `v1/pl.json` that covers
the same ground and write in that register. Do not paraphrase it into a
headline.

## Banned

- **Stock headline shapes.** "Everything you need…", "Never miss…", "Ready
  to…?", "…made easy", "…in seconds", "seamless", "perfect", "effortless",
  "powerful", "the only tool you need". In Polish the same list: „Wszystko,
  czego potrzebujesz…”, „prościej się nie da”, „w kilka sekund”, „idealny”,
  „bezproblemowy”.
- **Feature titles made of adjectives.** A title names a thing or an action -
  "Import and export", not "Import and export in seconds".
- **Exclamation marks**, outside a success toast and the changelog's own
  `title`.
- **Rhetorical questions as headings.** "Ready to seat your guests?" is not a
  heading, it is a gap where one should be.
- **Superlatives and comparisons to competitors** - we have no evidence for
  either.

## Rules

1. **Say what the thing does and what the person sees.** If a sentence would
   survive being moved to another product's website, it is not about this one.
2. **Prefer a real example to a category.** "vegan, gluten-free and the rest"
   beats "dietary requirements". "your mum, your partner, your planner" beats
   "collaborators".
3. **Errors say what happened and what to do next**, in that order, and never
   blame the person.
4. **Buttons are verbs naming the result** - "Seat everyone", "Print the plan" -
   not "Submit", "OK", "Continue" where something more specific is true.
5. **Length follows the slot.** A button is one or two words, a card body is one
   sentence, a hero subtitle is one sentence. Do not pad to fill a box.
6. **One claim per sentence**, so a claim that turns out to be false can be cut
   without rewriting the paragraph.

## Polish

Polish is the primary user-facing language. It is **written on its own terms,
not translated from English** - write the Polish first where you can, and let
the two versions differ in structure if that is what makes each one natural.

- **Marketing speaks to the couple in the plural** (Wy / Wasz / Zaplanujcie).
  Two people are reading it.
- **In-app UI uses singular imperatives** (Dodaj, Zapisz, Usuń), as it does
  today. Do not change register mid-app.
- **Quotes are „…”** - U+201E opening, U+201D closing, never the straight `"`.
  That is already the rule in 20 balanced pairs across `pl.json`, so a rewrite
  follows it rather than inventing it.
- **The dash is an ASCII hyphen with a space on each side** - like this - never
  an en or em dash. This is the dominant convention, not a universal one: see
  the normalisation list below.
- **Case after numbers** must be right: `1 gość`, `2 gości`… - the `_one` /
  `_few` / `_many` / `_other` suffixes exist for this, and a rewrite keeps every
  one of them.
- **No calques.** "Manage your guest list" is not „Zarządzaj swoją listą
  gości”; it is what a Polish person would actually say about their own list.

### Typography to normalise while rewriting

An audit of `pl.json` at v1 found eight strings that break the two rules above.
They are not separate work - each one sits in a group the copy pass already
touches, so fix it there.

| String                                                          | Breaks         |
| --------------------------------------------------------------- | -------------- |
| `tables.seated_elsewhere.named`                                 | straight quote |
| `fixtures.shape.polygon_hint`                                   | en dash        |
| `hall.list_hint`                                                | en dash        |
| `hall.delete_last_warning`                                      | en dash        |
| `assistant.tool.result.no_hall`                                 | en dash        |
| `assistant.tool.result.invalid_measures_one` / `_few` / `_many` | en dash        |

### One invisible character that must stay

`reminders.title` PL is „Przypo­mnienia" - with a **soft hyphen** (U+00AD)
after „Przypo". It is the only invisible character in either locale, and it is
deliberate: the sidebar rail is a fixed 60px strip and the label span sets no
wrap rules, so without a break opportunity the word overflows the strip. Do not
strip it as a stray character, and keep it if the string is retranslated.

English is the opposite case: a straight `"` **is** the convention there (17
strings, most of them legal prose), so leave it alone. EN takes no curly quotes.

## What we may not claim

Copied verbatim from `.claude/skills/video-plan/SKILL.md` §4, because the
highest-risk failure in any copy pass is promising a feature that does not
exist:

- ❌ **Live sync.** There is no Realtime. Collaborators see changes on reload.
  `landing.features.collab.desc` says _"zmiany synchronizują się od razu"_ - the
  landing page over-claims this. Do not amplify it.
- ❌ **Plus-ones / "osoby towarzyszące".** No such field on the guest model.
  `landing.features.guests.desc` over-claims this too.
- ❌ RSVP, sending invitations, collecting guest replies.
- ❌ Offline or installable. A manifest exists; there is no service worker.
- ❌ Venue templates, or "import the venue's floor plan". That is manual founder
  work - a third landing over-claim, in `landing.steps.one.desc` (_"lub
  zaimportuj jej plan"_).
- ❌ A generated PDF _file_. Export opens the browser print dialog
  (`plan_printed` says as much).
- ❌ Free or included AI. It needs the user's own API key.
- ❌ Reminders that notify. No push, no email, no calendar. It is a dated to-do
  list.
- ❌ A mobile app. Budget, vendors, timeline, registry, place cards, an
  auto-seat button. Undo/redo.
- ❌ **Any social proof.** No counts, logos, reviews or testimonials exist, so
  none may be shown, implied, or mocked up.
- ⚠️ Free use covers planning **your own** reception. Planners and venues
  working commercially need the paid plan (`terms.technical.c6`) - so "for
  wedding planners" framing is off-limits.

### The four strings that break it today

The list above names three. There is a fourth: `/venues` repeats the live-sync
claim. All four are what v1.1 takes back, and once it ships they are evidence of
what the copy used to say, not of what it says.

| Key                            | Claims                                        |
| ------------------------------ | --------------------------------------------- |
| `landing.features.collab.desc` | changes sync instantly - there is no Realtime |
| `venues.features.emails.desc`  | the same, to venue owners                     |
| `landing.features.guests.desc` | plus-ones - no such field on the guest model  |
| `landing.steps.one.desc`       | import the venue's floor plan - manual work   |

`venues.features.template.desc` and `venues.steps.one.desc` sit next to the
third one and describe the same manual founder work. They are honest only
because `/venues` sells an onboarding service rather than a feature - keep that
distinction explicit when rewriting them, or they become the fifth over-claim.
