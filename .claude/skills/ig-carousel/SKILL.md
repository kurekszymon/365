---
name: ig-carousel
description: Turn a folder of wedding/venue photos into a numbered, post-ready Instagram carousel (1080x1350, 4:5, max 10 slides) that opens with the easywed plan slide - picking the best shots, ordering them, and cropping with ImageMagick only. Use when asked to make photos "IG ready", "post ready", or build a carousel from a photo folder, usually after /plan-slide.
---

Build an Instagram carousel from the photos in **$ARGUMENTS** (a folder; empty → the current directory).

Beside this file:

- `crop45.sh <src> <out.jpg> [fx] [fy]` - largest 4:5 box centred on a focus point (fractions of
  width/height, default `0.5 0.5`, clamped to the image), Lanczos to 1080x1350, light unsharp, sRGB,
  metadata stripped, q92 4:4:4. Prints the crop box and the upscale factor.

Needs `magick` (Homebrew ImageMagick). No PIL here.

## Hard rules

- **ImageMagick only - crop, resize, sharpen.** Never regenerate, outpaint or AI-upscale a photo
  (it adds watermarks / invents detail). No colour grading unless asked.
- **1080x1350 (4:5)** for every slide - it matches the plan slide and fills the feed.
  **Crop, don't pad.** Offer beige bars (`#f4f1e9`, the plan slide's backdrop) only as an alternative
  for a landscape shot that loses too much.
- **10 slides max**, plan slide included. Adding one when at 10 means dropping one - say which and why.
- The plan slide (`plan-sali-ig.jpg`, made by `/plan-slide`) is **slide 1, copied byte-for-byte** - it is
  already 1080x1350, never re-encode it.

## 1. Look before choosing

Make a contact sheet in the scratchpad and Read it. `montage -label` fails on this machine
("unable to read font") - leave labels off and rely on glob order:

```bash
magick montage "$DIR"/*.jpg -geometry 400x500+6+6 -tile 4x "$WORK/contact.jpg"
magick identify -format '%f %wx%h\n' "$DIR"/*.jpg
```

## 2. Pick and order

Order that worked: **plan → empty hall → decorated hall → couple's table → details**.

- If there is an **empty-hall / before shot, it goes at #2**, straight before the decorated hall, so the
  transformation reads at a glance (user's call, not negotiable).
- Then the wide decorated room, the couple's table (wide, then other angles), the hanging floral
  arrangement, the table sign card, flower close-ups, a guest-table centrepiece, a place setting.
- **Drop near-duplicates.** When a pro photo and a phone shot show the same scene, keep the pro one.
  Several wide room shots from one angle → keep one.
- Phone shots (3:4, ~1086-1170px wide, warmer/more saturated) are fine as extra angles; say they look
  different from the pro set and offer to tone them down rather than doing it unasked.
- If the user mentions files by a name that doesn't exist (e.g. "starting with guid" for
  `825309726_…_n.jpg`-style names), say what you matched and carry on.

## 3. Crop

Pick the focus point by looking: for landscape shots that is the subject's x (barn doors were at
`fx≈0.375-0.45`); portrait shots usually just need `fy` nudged so tops of chairs/flowers aren't cut.

```bash
mkdir -p "$DIR/ig" && cp "$DIR/plan-sali-ig.jpg" "$DIR/ig/01-plan-sali.jpg"
"$SKILL_DIR/crop45.sh" "$DIR/sala-pusta.jpg" "$DIR/ig/02-sala-pusta.jpg" 0.375
"$SKILL_DIR/crop45.sh" "$DIR/K x S (378).jpg" "$DIR/ig/04-stol-pary.jpg" 0.5 0.4
```

Output goes to `ig/` inside the photo folder, named `NN-short-polish-name.jpg` (`02-sala-pusta`,
`03-sala`, `04-stol-pary`, `06-dekoracja-kwiatowa`, `07-winietka`, `08-kwiaty`, `09-stroik`,
`10-nakrycie`) so the filenames are the posting order. Before rebuilding, look at what's in `ig/` -
it's this skill's own output, safe to replace; on a reorder, renumber with `mv` rather than re-cropping.

## 4. Check and report

Montage the finished `ig/` (`-geometry 320x400+5+5 -tile 5x`) and Read it - check no crop beheads
the subject. Then report a table: slide, file, source, what it shows. Also say:

- which candidates were left out and why;
- any slide upscaled more than ~1.3x (the script flags it) - the source is small;
- any photo that looks third-party (venue website shots, a different naming scheme from the
  photographer's set) - suggest crediting / asking before posting.
