---
name: video-plan
description: Plan a series of short easywed marketing videos, grounded in what the product actually does at the easywed/v1.1.2 tag and in what the Remotion repo can render. Use when asked to plan, brief or prioritise marketing videos, Reels, TikToks or a walkthrough for easywed - not for producing them.
---

Plan a series of short marketing videos for **easywed** (`typescript/easywed`), to be produced in
the Remotion project next door (`typescript/easywed-video`).

Scope for this run: **$ARGUMENTS** — if that is empty, plan the full series described in section 7.

Two lists live beside this file, because they go stale faster than the rest of it:

- `references/v1-facts.md` — section 3, the confirmed selling points
- `references/existing-films.md` — section 6, the beats and lines already used

Read both before writing. If you are running this outside the `365` monorepo and cannot open them —
or any file named in section 2 — say so and ask for them rather than guessing at their contents.

---

## 1. Objective

Plan short videos whose single job is: **a Polish engaged couple opens easywed.app and builds a
seating plan in guest mode today.**

Acquisition, not retention. Not B2B. The venue and CRM audience — everything under `venues.*` on the
landing page — is explicitly out of scope, and so is anything aimed at wedding planners as a trade
(see the last bullet of section 4). One audience: a couple with a date, a hall and a guest list.

## 2. Read this first

Read all of these before writing a single beat. The product is pinned at the `easywed/v1.1.2` tag, so
read that tag rather than the working tree — and note the monorepo path trap: from inside
`typescript/easywed/`, `git show` needs the `./` form.

```bash
cd typescript/easywed
git show easywed/v1.1.2:./src/i18n/locales/pl.json                    # NOT easywed/v1.1.2:src/...
```

From `typescript/easywed/`, at the `easywed/v1.1.2` tag:

- `./src/i18n/locales/pl.json` — the product's own Polish voice. Flat dotted keys, not nested: grep
  the `landing.`, `guests.`, `seats.`, `tables.`, `hall.`, `export.` and `guest_mode.` prefixes.
  Every Polish word on screen should be a word the app itself uses.
- `./src/i18n/locales/changelog/v1/pl.json` — the best long-form prose in the repo. Its `summary`
  and `i1`–`i7` read as a ready-made script; mine them, do not paraphrase them into marketing-speak.
  `changelog/v1.1/` and `changelog/v1.1.2/` add no features - both say the planner is unchanged
  (v1.1 rewrote the app's wording, v1.1.2 the landing page) - so v1's feature set is still the
  whole of it, but many strings now read differently from v1. Quote the tag, never memory.
- `./docs/guest-vs-account.md` — the guest-mode vs. account feature matrix. This is what decides
  whether a video can honestly say "bez konta" about the thing it is showing.
- `./src/components/landing/LocaleLanding.tsx` — the landing section order, i.e. what a viewer sees
  one second after the CTA lands: hero → `LandingStories` → features → steps → CTA band → FAQ →
  the venue banner.
- `./src/components/landing/LandingStories.tsx` and `LandingLoop.tsx` — the landing's only video
  slots. There are exactly three, and `LoopName = "swap" | "scale" | "shape"`: `easywed-swap`,
  `easywed-scale` and `easywed-shape` are already on the page as `/landing/{lang}/easywed-{name}.mp4`
  with a WebP poster.
- `./src/lib/analytics/track.ts` — the **closed** `AnalyticsEvents` map. Success signals must be
  named from this map and nothing else; inventing an event is forbidden. What exists at the tag
  (unchanged since v1):
  `wedding_created`, `local_wedding_migrated`, `table_added`, `tables_batch_added`, `guest_added`,
  `guests_imported` (`format: "csv" | "xlsx"`), `guests_exported`, `plan_printed`, `guest_seated`
  (`source: "canvas_seat" | "guest_list"`), `ai_chat_message_sent`, `reminder_created`,
  `invite_claimed`.

In `typescript/easywed-video/`:

- `README.md` — compositions, render scripts, and how one set of scenes serves two aspect ratios
- `src/easywed/timeline.ts`, `theme.ts`, `layouts.ts`, `format.ts`, `data.ts`
- `src/easywed/showcase/demo/Film.tsx`, `src/easywed/showcase/teaser/Teaser.tsx`,
  `src/easywed/components/`. Films sit in groups under `src/easywed/{group}/`, one per series
  (see the README's *Structure*).

## 3. What is true at the tag

**→ `references/v1-facts.md`.** The confirmed selling points: the whole pool of real material a
video may draw on. Nothing outside that file and section 2's reading is fair game.

## 4. Do not claim

This list stays here rather than in a reference file, because it is the highest-risk part of the
exercise and must not be one unread file away. The failure mode this whole skill exists to prevent
is a plan that promises features the tagged product does not have. Carry the list into the output
document verbatim.

At `easywed/v1` the landing page itself over-claimed three of these (live sync, plus-ones, importing
the venue's plan). The v1.1.2 landing rewrite removed all three, so the landing is no longer a
reason to be wary, but it is not a licence either: films and plans written before it may still
carry the old lines (see the caveat at the end of `existing-films.md`).

- ❌ **Live sync.** There is no Realtime. Collaborators see changes on reload - the landing now
  says so itself: `landing.features.invite.desc`, *„Wasze zmiany zobaczą przy kolejnym otwarciu
  strony.”*
- ❌ **Plus-ones / "osoby towarzyszące".** No such field on the guest model.
- ❌ RSVP, sending invitations, collecting guest replies.
- ❌ Offline or installable. A manifest exists; there is no service worker.
- ❌ Venue templates, or "import the venue's floor plan". That is manual founder work.
  `landing.venues_banner.subtitle` (*„Pary planują na odwzorowaniu Twojej prawdziwej sali”*) is
  venue-facing copy, out of scope under section 1 - never carry it into a couple's video.
- ❌ A generated PDF *file*. Export opens the browser print dialog (`plan_printed` says as much),
  and at the tag the app now says so too: *„Wydruk”* → *„Wydrukuj plan”* → *„Otwórz okno
  drukowania”*. `export.pdf.landscape_hint` mentions saving as PDF from that dialog - that is the
  browser's feature, not easywed's; do not claim it.
- ❌ Free or included AI. It needs the user's own API key.
- ❌ Reminders that notify. No push, no email, no calendar. It is a dated to-do list.
- ❌ A mobile app. Budget, vendors, timeline, registry, place cards, an auto-seat button. Undo/redo.
- ❌ **Any social proof.** No counts, logos, reviews or testimonials exist, so none may be shown,
  implied, or mocked up.
- ⚠️ Free use covers planning **your own** reception. Planners and venues working commercially need
  the paid plan (`terms.technical.c6`) — so "for wedding planners" framing is off-limits.

## 5. Production constraints

The plan has to be buildable in the Remotion repo as it stands:

- **30 fps.** `TransitionSeries` overlaps its neighbours, so a composition is shorter than the sum
  of its scenes: `total = Σ scenes − TRANSITION × (scenes − 1)`. The walkthrough is 840f from
  120+210+180+240+150 at `TRANSITION = 15`; the teaser is 450f from 90+100+176+108 at
  `TEASER_TRANSITION = 8`. Every duration you propose must be arithmetic, not a guess.
- **It is silent. There is no audio anywhere in the project.** Every idea must land sound-off, with
  all of its meaning on screen. No voiceover, no music sting, no "beat drops here".
- **One set of scenes serves every size** through `useFormat()` (`src/easywed/format.ts`), which
  today branches on a binary `tall = height > width` and hands back `WIDE_HALL` or `TALL_HALL` plus
  a type scale. **A 1:1 cut therefore needs a third branch and a third hall plan.** Price that as
  real work in the build order, not as a free extra size.
- **Palette and type are fixed** in `theme.ts` (Playfair Display headings, Inter UI), mirroring the
  app's `editorial` palette. Halls live in `layouts.ts`: `WIDE_HALL` and `TALL_HALL`, **58 seats in
  both**, so a guest count reads identically across cuts.
- **App chrome must stay a redraw of the real planner** — `AppFrame`, `PlannerCanvas`, `HallCanvas`.
  A viewer should recognise the product the moment they open it.
- **Polish copy uses the app's own nouns**: sala, stół, gość, miejsce, parkiet, *Bez miejsca*,
  *Rozsadzeni*, *Wege* / *Vegan* / *Bez glutenu*, *Piętro*, *Elementy sali*.
- `pnpm run lint` (eslint + tsc) must pass; render scripts are in `package.json`.

## 6. Do not repeat what exists

**→ `references/existing-films.md`.** The beats both finished films already use, and every Polish
line already burned on screen. New videos may reuse components, never beats or lines — check every
line you write against that file before it reaches the document.

## 7. Output contract

Write a **new file** at `typescript/easywed-video/docs/video-plans/{scope}-{date}.md`.

- `{date}` is today, `YYYY-MM-DD`. **Get it from `date +%F`** — do not write a date from memory.
- `{scope}` is a short kebab-case slug for this run's scope, derived from `$ARGUMENTS`:
  `full-series` when it is empty, otherwise two to four words (`/video-plan 2 videos, only 9:16` →
  `2-videos-9x16`). Filename-safe only: no `:`, `/` or spaces.
- **Never overwrite an existing file.** Each run authors a new plan rather than revising an old one —
  the output is not deterministic, so a re-run is a different document, not an update. If that exact
  name is taken, append `-2`, `-3`, and so on.
- Open the file with a one-line header naming the scope, the date and the product tag it was written
  against, so the document is self-describing once it is one of several in that directory.

The document contains:

1. **Strategy** — one short paragraph: who, where, what action, why now.
2. **A prioritised table** — id, hook, format, length, channel, effort, and which ships first.
3. **One brief per video**, each carrying:
   - slug and the Remotion composition ids it would register
   - duration **in frames**, with the scene arithmetic shown
   - aspect ratio(s)
   - the single idea, in one sentence
   - **the hook for the first 1.5 s, verbatim in Polish**
   - a beat table: frame range → what is on screen → the exact on-screen copy
   - the CTA
   - which app surface it shows
   - which existing components it reuses, and what genuinely new ones it needs
   - caption + hashtags for its channel, in Polish
   - **a claim-check line** naming the evidence at the tag (file, key, or event) for every claim the video
     makes — no brief is complete without one
4. **A build order** with effort per item, and **open questions for the user**.

Cover all four target formats:

- **9:16** — Reels / TikTok
- **16:9** — landing-page loops, with **no CTA card**: the page under the video *is* the CTA. All
  three landing slots are taken (section 2), so a new loop either replaces one of `swap` / `scale`
  / `shape` or needs a new `LoopName` and story in the app. Say which, and cost it in the build order.
- **1:1** — feed posts, each flagged with the `useFormat()` third-branch cost from section 5
- **60–90 s YouTube walkthrough** — seeded from the existing 28 s film rather than built new

## 8. Creative rules

One idea per video. The hook is a pain or a question, never a feature name. Show the product doing
the thing — no talking-head substitutes, no abstract motion graphics standing in for a screen.
Sound-off by default. The CTA is one imperative action line tied to the video's own payoff (what the
viewer does next, e.g. *"Wczytaj swoją listę gości"*), then the easywed.app pill - both drawn by
`components/CallToAction.tsx`. Not a disclaimer like *"bez zakładania konta"*; that belongs in the
caption. No invented numbers, no
fake counts, no implied popularity. Polish typography as this repo writes it.

## 9. Before writing, verify

- Re-read every claim in every brief against section 4. If a line is not backed by
  `references/v1-facts.md`, cut it or rewrite it until it is.
- Check every line against `references/existing-films.md` — nothing burned may appear again.
- Check the frame maths against `timeline.ts` — the sum, minus one transition per seam.
- Confirm each success signal is a real key in the `AnalyticsEvents` map.
- **Ask the user** about channel, budget and posting cadence rather than assuming them; put the
  questions at the end of the document as well as raising them in chat.

Do **not** produce any of the videos. This run ends at briefs plus a build order; implementation is a
separate pass, one brief at a time, with `/video-build <id>`.
