# lrn-a-lng

a language learning PWA with 5 levels

## overview

- Home — level grid with unlock progression, Polish descriptions by default
- Level — flash cards with flip animation, "Knew it" / "Didn't know" rating, swipe support, progress bar
- Review — resurfaces struggled cards using time-based spacing (simplified Leitner), shows empty state when nothing to review
- Settings — source language (Polish/English), UI language, export/import progress, reset
- Level Summary — post-level stats with next level / review mistakes CTAs

## Tech

Vite + React + TypeScript, Tailwind v4, Zustand (persisted to localStorage), react-router-dom, i18next, vite-plugin-pwa. Zero backend — content is static JSON fetched on demand, cached by service
worker.

## Content

5 levels x 12 cards each (60 total sentences) with progressive vocabulary — basic verbs → places → food → people → time/routine. Each card has Polish + English source, Russian target, highlighted
new words, and grammar notes.
