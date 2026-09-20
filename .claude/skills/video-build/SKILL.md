---
name: video-build
description: Build one brief from a /video-plan document as Remotion compositions in typescript/easywed-video - scenes, timeline, Root registration, render scripts - after re-verifying its copy, claims and frame maths against easywed/v1. Use when asked to build, implement or produce a video from docs/video-plans/ - not for planning new ones.
---

Build **one** video from a plan written by `/video-plan`, in the Remotion project at
`typescript/easywed-video`.

Target for this run: **$ARGUMENTS**

- `import-excel` — that brief id, from the newest plan in `docs/video-plans/`
- `docs/video-plans/full-series-2026-09-11.md import-excel` — that brief, from that plan
- empty — the newest plan, first step of its **Build order** whose composition ids are not yet
  registered in `src/Root.tsx`. Say which brief you picked before touching anything.

"Newest" is the latest `{date}` in the filename, then the highest `-N` suffix. If the id matches no
brief, list the plan's brief ids and ask. Asked for several videos, build them one at a time and
finish section 8 for each before starting the next — each video is its own reviewable diff.

---

## 1. The plan is a strong draft, not a spec

A plan is written from reading code, not from running it, and it gets things wrong. The first plan
quotes *„Przeciągnij plik tutaj”* as the app's own `guests.import.drop_here`; at `easywed/v1` that
key actually reads *„Przeciągnij tutaj plik .csv lub .xlsx lub kliknij, aby wybrać”*.

So: **the brief decides what the video says and in what order; `easywed/v1` and this repo decide
whether it is true and how it is drawn.** When they disagree:

- **Factual or mechanical** — a string that differs at the tag, a key or component that does not
  exist, frame arithmetic that does not add up, an example number that does not match
  `layouts.ts` → follow the source of truth and record the deviation for the report.
- **Creative or claim-bearing** — anything that would change the idea, the hook, a claim, the CTA,
  the aspect ratios or the length → stop and ask.
- **On the `/video-plan` section 4 do-not-claim list** → never build it, whatever the brief says.

Never edit the plan document. It is a dated record of what was decided; deviations belong in the
report at the end of this run.

## 2. Read this first

- **The whole brief**, plus the plan's *Build order*, *Findings* and *Open questions*. An open
  question can decide whether a brief gets built at all (the first plan asks whether 1:1 is worth
  the `format.ts` cost). If one bears on this brief and the conversation has not answered it, ask.
- `.claude/skills/video-plan/SKILL.md` — section 4 (do not claim), section 5 (production
  constraints) and section 8 (creative rules) bind the build exactly as they bound the plan.
- `.claude/skills/video-plan/references/v1-facts.md` and `references/existing-films.md`.
- In `typescript/easywed-video/`: `README.md`, `package.json`, `src/Root.tsx`, and in
  `src/easywed/`: `timeline.ts`, `format.ts`, `layouts.ts`, `data.ts`, `theme.ts`, `geometry.ts`.
- **All of `src/easywed/teaser/`** — the template for a self-contained cut: its own timeline, its
  own `TransitionSeries`, its own scenes, drawing on the shared theme, layouts and components.
- Every component the brief lists under *Reuses*. Read its props; do not infer them from the name.
- For every app surface the brief redraws, the real component at the tag. Find it from its i18n
  keys, and mind the path trap — from inside `typescript/easywed/`, `git show` needs `./`:

  ```bash
  git -C ../easywed grep -n 'guests.import.map_columns' easywed/v1 -- src
  git -C ../easywed show easywed/v1:./src/components/…/ThatDialog.tsx
  ```

## 3. Verify the brief before writing code

Work through this list in chat, not in a file. Collect every stop-and-ask item and ask them together
with AskUserQuestion, then build.

1. **Copy.** For every on-screen string in the hook, the beat table and the CTA:
   - Where the brief cites an app key, `git show easywed/v1:./src/i18n/locales/pl.json | grep
     '"that.key"'` and use the value **verbatim**. If the real value is too long for the frame, ask —
     never invent a shorter line and attribute it to the app.
   - It must not appear in the burned list in `existing-films.md`. The *„easywed.app”* pill is the
     one thing allowed to recur; the CTA's action line above it must be new.
   - It must not make a section 4 claim.
   - The `*„…”*` around copy in a plan is the plan quoting it, not glyphs to draw. The existing
     scenes render their lines bare (`teaser/scenes/HookScene.tsx`). Draw quotation marks only
     where the copy itself quotes something.
2. **Claims.** Open every file, key, event and matrix row named on the brief's claim-check line. One
   that is missing means the claim is not established — ask. Success signals come only from the
   closed `AnalyticsEvents` map in `easywed/v1:./src/lib/analytics/track.ts`.
3. **Frames.** Recompute `total = Σ scenes − T × (scenes − 1)` and check it against the stated
   total. Beat-table ranges are composition-global; scene *i* (0-based) starts at
   `Σ(scenes before i) − T × i`, and the table must agree. The hook lives in the first 45 frames,
   so scene 1's line must be fully readable by its local frame 45.
4. **Numbers on screen.** Every count, dimension and distance is computed from `layouts.ts` or
   `data.ts` while rendering — as `PlanScene` reads `hall.totalSeats` — and never typed. When the
   brief's example number disagrees with the computation, the computation wins.
5. **Ids.** Composition ids are one flat namespace across `Root.tsx`, scenes included (`Intro`,
   `Hall`, `Guests`, `Seating`, `Outro`, `Hook`, `Chaos`, `Plan`, `Cta` are taken). Ids and folder
   names allow only `a-z A-Z 0-9 -`. Films are lowercase `easywed-…`, with `-vertical` and
   `-square` twins.
6. **Prerequisites.** If a *Build order* step before this one produces something this brief reuses
   (the long walkthrough needs `ImportDialog` and `PrintSheet`) and it does not exist yet, stop and
   say which step comes first.
7. **Formats.** A brief that needs 1:1 while `format.ts` still branches only on `tall` needs
   section 6 first.

## 4. Where things go

Mirror the teaser:

```
src/easywed/{slug}/
  timeline.ts        {SLUG}_SCENES, {SLUG}_TRANSITION, {SLUG}_DURATION
  {Name}.tsx         the TransitionSeries, shaped like teaser/Teaser.tsx
  scenes/            one {Beat}Scene.tsx per beat
  components/        parts only this video uses
```

- `{slug}` is the brief id (`import-excel`); constants are its SCREAMING_SNAKE form
  (`IMPORT_EXCEL_SCENES`).
- `{SLUG}_DURATION` is **computed** from the scene map, exactly as `teaser/timeline.ts` does, with a
  comment stating the frames and seconds. Never write the total as a literal.
- A social cut defines its own transition; a walkthrough-length film uses the shared `TRANSITION`.
- A component the plan says **another video also reuses** goes in `src/easywed/components/`, not in
  the video's folder.
- **Published films do not change.** When a brief reuses an existing scene with different copy (the
  long walkthrough's new hook over the reused `Intro`), add an optional prop whose default is the
  current behaviour, so `easywed-demo` and `easywed-teaser` render exactly as before. The one
  exception is a *Findings* item the brief itself depends on — fix that, and say so in the report.

## 5. Building scenes

- **House style.** Follow the existing scenes: `useCurrentFrame()`, `spring` and clamped
  `interpolate`, and timings as named constants at the top of the file with a one-line comment on
  what they pace. `Backdrop` is the ground.
- **Formats come from `useFormat()`** — `tall`, `hall`, `type`, `pad`, `gap`. Do not branch on
  `width`/`height` yourself. Size a canvas the way `PlanScene` does, from `canvasInsets()` and
  `hallAspect()`, not with fixed pixels.
- **Colours and fonts come only from `theme.ts`.** If a surface genuinely needs a new colour, add it
  there with a comment naming where in the app it comes from.
- **Redraws follow the app.** A new surface matches the real component at the tag — order, labels,
  icons, states — the way `AppFrame.tsx` follows `Header/*`. Open the file with a comment naming the
  app component it redraws.
- **Demo data** comes from `data.ts`. Extending it is fine; keep the names Polish with their
  diacritics, and never add anything that reads as a user count or popularity.
- **Silent.** No `<Audio>`, no sound files. Every beat must land sound-off.
- **Readable.** A line stays fully on screen for roughly 10 frames per word, and never less than 30.
  In Polish, a line must not wrap after a lone `w`, `z`, `i`, `o`, `a` or `u` — bind the word to the
  next one with ` `.
- **Typography** as the repo writes it: a spaced hyphen ` - ` rather than an em dash, `·` as the
  separator, `„…”` only for real quotations.
- **Landing loops** (16:9, no CTA card): the last frame must hand back to frame 0. Derive the pose
  from the frame, so both ends compute the same state, rather than animating out and hoping.

## 6. The square branch — only when a brief needs 1:1

This touches the one file every scene reads. Do it as a separate step before any of the video's
scenes, and suggest the user commit it on its own.

- Keep `tall` so no existing scene has to change, and add `shape: "wide" | "tall" | "square"`.
- Add `SQUARE_HALL` to `layouts.ts` through `withDerived`. Its `totalSeats` must equal
  `WIDE_HALL.totalSeats`, so counts read identically across cuts.
- Add a third type scale, then check every helper that takes `tall: boolean` (`canvasInsets`,
  `chromeScale`, and so on) for what a square frame should get.
- Before editing, take stills of `easywed-demo`, `easywed-demo-vertical`, `easywed-teaser` and
  `easywed-teaser-vertical` at the middle of every scene. Afterwards, take them again and compare.
  They must be unchanged.

## 7. Register it

- **`src/Root.tsx`** — the film's compositions after the teaser's, with a one-line comment, plus a
  `<Folder>` named after the video holding each scene at its primary aspect ratio.
- **`package.json`** — `render:{slug}` (and `:vertical` / `:square`) rendering to
  `out/{composition-id}.mp4`, each appended to `render:all`.
- **`README.md`** — a compositions table for the film, its render commands, and a line in
  *Structure*.

## 8. Verify

Run in order, fixing and re-running before moving on:

1. `pnpm run lint` (eslint + tsc).
2. `pnpm exec remotion compositions` — every new id, size and duration matches the brief. `easywed-demo`
   is still 840 and `easywed-teaser` still 450.
3. **Stills**, for every size the film registers, into `out/{slug}/`:
   - frame 45 — the hook has landed
   - the middle of every scene
   - the middle of every seam — scene start + `T / 2`
   - the last frame, `durationInFrames − 1`; for a loop, frame 0 as well

   ```bash
   pnpm exec remotion still easywed-import-vertical out/import-excel/vertical-0045.png --frame=45
   ```

4. **Look at every still** with Read. Check for text that is clipped, overflowing or badly wrapped;
   diacritics drawn in both fonts; nothing hidden under the portrait tab bar; on-screen copy
   matching the section 3 list character for character; counts agreeing with the canvas; and, for a
   loop, the last frame matching frame 0.
5. If a reused scene gained a prop, take a still of its existing composition before and after, and
   compare them.
6. **Do not render the full video unless the user asks.** Rendering is slow, and fetching the Google
   Fonts needs a network connection.

## 9. Bookkeeping

- Add the new film to `.claude/skills/video-plan/references/existing-films.md`: composition id,
  length, a one-line beat sequence, the scene arithmetic, and **every Polish line now on screen**
  appended to the burned list. That file's own rule — skip it, and the next `/video-plan` run offers
  these lines as fresh ideas.
- If this build fixed a *Findings* item (the plus-one line in `GuestsScene.tsx`), update that file's
  caveat section to match.
- If the build needed a v1 fact that `v1-facts.md` lacks, add it, with its evidence.
- **Do not commit.** Propose a message in the repo's style (`easywed-video: …`) and let the user
  commit.

## 10. Report

End with:

- which brief, from which plan
- files added and changed
- **every deviation from the brief**, each with its evidence (key and value, file and line, the
  arithmetic)
- the stills taken and what was checked on them
- what is still open: unanswered questions, a render not run, *Findings* not touched
- the proposed commit message
