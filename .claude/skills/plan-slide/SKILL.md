---
name: plan-slide
description: Turn a screenshot of the easywed planner into a polished 4:5 Instagram carousel slide (1080x1350) - date, a short stats line, the plan on a card, and the easywed logo signature. Use when asked to make a planner screenshot "nice", "Instagram-ready", or a carousel/post image of a seating plan.
---

Turn a planner screenshot into an Instagram carousel slide that sits alongside wedding photos.

Input: **$ARGUMENTS** - a screenshot path (or an image pasted into the conversation), plus optionally the
wedding date and a subtitle. Anything missing: read it off the screenshot (the date is in the app header)
and derive the subtitle yourself (step 2).

Beside this file:

- `template.html` - the slide. Placeholders `{{DATE}}` and `{{SUBTITLE}}`; it loads `plan.png` from its own folder.
- `render.sh <workdir> <out>` - headless Chrome at 2x, then Lanczos down to 1080x1350. Writes `<out>.jpg` and `<out>@2x.png`.

Needs `magick` (Homebrew ImageMagick) and Google Chrome. There is no PIL on this machine - don't reach for Python imaging.

## 1. Crop the plan out of the app

Work in the session scratchpad. Crop **only the canvas**: every hall with its dimension labels ("40 m", "30 m"),
and none of the app chrome - header, left sidebar, top-right toolbar (1 m / Siatka / Mierzenie / Miejsca),
zoom control. Look at the screenshot, pick the box, then **Read the crop back** to check no hall edge or
label is clipped:

```bash
magick input.png -crop WxH+X+Y +repage "$WORK/plan.png"
```

For the reference 2000x1095 screenshot the box was `1730x870+180+145`.

Keep it as one image with the halls side by side, exactly as laid out in the app. These were tried and
rejected:

- stacking the halls vertically to make better use of the 4:5 frame - it misrepresents the room;
- full-bleed, frameless band with the side labels trimmed - "looks worse". The card stays.

If the user wants the plan bigger, the honest lever is a better source (zoom in further / larger window
before screenshotting), not cropping the plan or editing the layout.

## 2. Copy

- **Date**: `DD · MM · YYYY` with spaced middots, e.g. `24 · 07 · 2026`.
- **Subtitle**: `N gości · M stołów · jeden wieczór`. Count from the screenshot, don't guess:
  guests = sum of the *assigned* side of every `x / y` label, **including** the couple's table
  ("Para młoda 2 / 2"); tables = every table including the couple's (the sidebar's Stoły badge is a
  cross-check). Use correct Polish plurals (`1 gość / 2-4 goście / 5+ gości`, `stół / stoły / stołów`).
- **No** overline like "PLAN SALI WESELNEJ", and **no** "rozsadzone w easywed" - the signature is just the
  logo + `easywed.`.

Write the copy into a copy of the template:

```bash
sed -e "s|{{DATE}}|$DATE|" -e "s|{{SUBTITLE}}|$SUBTITLE|" \
  "$SKILL_DIR/template.html" > "$WORK/slide.html"
```

## 3. Render and check

```bash
"$SKILL_DIR/render.sh" "$WORK" plan-sali-ig
```

Read the `.jpg` back and look at it before reporting. Then copy both files to `~/Desktop/` (that's where the
user picks them up) and say so.

## Design decisions baked into the template - keep them

- Background is the films' backdrop: cream `#f4f1e9` with the two soft green radial blooms from the app icon.
- Date: Playfair Display 400, 96px. A 64px hairline rule, then the subtitle in Playfair italic 30px `#5b544c`.
- Plan: on a `#fdfbf6` card, 14px padding, 22px radius, soft green-tinted shadow, image 988px wide.
- Bottom padding is 160px (not 72px): Instagram draws the carousel dots over the bottom ~8% of the image,
  and at 72px they sat on top of the logo. Keep the signature clear of the bottom ~110px.
- Signature: the logo mark (inline SVG lifted from `typescript/easywed/public/easywed-icon.svg`, its
  square background and blooms dropped) **side by side** with `easywed.` in Playfair 600, ink `#241f1a`,
  logo 62px / text 46px / 18px gap.
- The wordmark carries `transform: translateY(-0.15em)` (same fix as the app header, `Brand.header.tsx`) so the **logo's centre sits on the centre of the
  lowercase x-height**, not on the line box. If you change either size, re-measure rather than eyeballing:

  ```bash
  magick "$WORK/plan-sali-ig@2x.png" -crop 1000x260+600+2360 +repage -colorspace gray \
    -threshold 80% -negate -define connected-components:verbose=true \
    -define connected-components:area-threshold=30 -connected-components 8 null:
  ```

  The big square-ish blob is the logo's centre circle; the ~40x52 blobs are `e`/`a`/`s`. Their vertical
  centres (y + h/2) should match.
