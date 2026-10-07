# easywed.

A wedding seating planner at [easywed.app](https://easywed.app): draw the hall to scale, add the guest list, and seat everyone. It is built for couples first, and venues get their own subdomain with a CRM.

Polish is the main language, and English is fully supported.

## What it does

- **Planner**: a drag-and-drop canvas with multiple halls, round, rectangular and custom-polygon tables, fixtures (dance floor, DJ, bar…), a measure tool and seat-level assignment. Positions are in metres, local to each hall.
- **Guests**: dietary tags, notes, CSV/XLSX import with column mapping, and export to CSV (flat or grouped by table) or a printable PDF.
- **Guest mode**: no account needed, and the whole plan lives in `localStorage`. Signing up later adopts the plan into the account in one atomic RPC.
- **Sharing**: invite links for `owner` / `editor` / `viewer`, plus a derived `venue` role that sees a pseudonymised seat map (no guest names or notes).
- **Venues (tenants)**: `<slug>.easywed.app` hosts a venue landing page and a staff CRM with menu packages, linked weddings, a kitchen report and staff invitations.
- **Reminders** and a **menu** tab (when the wedding is linked to a venue).
- **AI assistant** (bring your own key): any OpenAI-compatible endpoint (OpenRouter by default, with llama.cpp presets). Requests go straight from the browser to that endpoint, and the assistant edits the layout through tools.

## Stack

| Area      | What                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing), Vite 8    |
| UI        | Tailwind v4, [shadcn/ui](https://ui.shadcn.com) (Radix), lucide, sonner, vaul          |
| Canvas    | dnd-kit + @use-gesture                                                                 |
| State     | Zustand (`persist` gated to the local wedding)                                         |
| Backend   | [Supabase](https://supabase.com): auth, Postgres, RLS, `security definer` RPCs         |
| i18n      | i18next, flat dotted keys in `src/i18n/locales/{pl,en}.json`                           |
| Analytics | [PostHog](https://posthog.com): cookieless by default, cookies and replay only after consent |
| Import    | SheetJS (CDN build, lazy-loaded) for XLSX/CSV                                          |
| AI        | Vercel AI SDK + `@ai-sdk/openai-compatible`                                            |
| Tests     | Vitest + Testing Library (RLS specs run against the local Supabase stack)              |
| Hosting   | Cloudflare Pages: mostly prerendered static site, with an SPA fallback for the app     |

### PostHog and privacy

- Event properties are a closed, typed map (`src/lib/analytics/track.ts`), so no user-typed string reaches PostHog.
- Autocapture is off, and invite and auth tokens are scrubbed from URLs.
- `cookieless_mode: "on_reject"` + `opt_out_capturing_by_default`: visitors who haven't answered the cookie banner get the same cookieless capture as visitors who rejected it.
- Session replay runs only after consent and masks every text node and input.
- Venues are attributed with PostHog groups, never `identify`.

## Getting started

```bash
pnpm install
supabase start          # local stack, see docs/supabase.md
pnpm types:gen          # regenerate src/lib/supabase.types.ts from the local DB
pnpm dev                # http://localhost:3000, venues on <slug>.localhost:3000
```

`.env.local` needs:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=
VITE_PUBLIC_POSTHOG_HOST=
```

## Scripts

| Command                      | What                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                   | dev server on port 3000                                              |
| `pnpm build` / `preview`     | production build to `.output/public`                                 |
| `pnpm test [file]`           | Vitest (`pnpm dlx vitest` for watch mode)                            |
| `pnpm typecheck`             | `tsc --noEmit`                                                       |
| `pnpm lint` / `format`       | ESLint / Prettier                                                    |
| `pnpm types:gen`             | Supabase types from the local DB                                     |
| `pnpm legal:check`           | fails while `src/lib/legal/config.ts` has placeholders               |
| `pnpm deploy:pages`          | `legal:check` → build → `wrangler pages deploy`                      |

`supabase db reset` re-applies every migration and is the fast loop while you edit one. Once a migration is pushed to remote, never edit it; add a new one instead.

## Layout

```
src/
  routes/           file-based routes (marketing pl/en, app, auth, venue + crm tenant hosts)
  components/       planner/, dialogs/, crm/, auth/, consent/, ui/ (shadcn)
  stores/           Zustand stores (planner.store.ts is the big one)
  lib/sync/         loadWedding + mutations/ (optimistic store → Supabase via run())
  lib/analytics/    PostHog events, consent, token scrubbing
  lib/legal/        legal config (trader identity, dates) feeding the legal pages
  lib/ai/           BYO-key planner assistant
  i18n/             translations + per-release changelog
supabase/
  migrations/       schema, RLS, triggers, RPCs
templates/          Supabase auth email templates
docs/               supabase.md, guest-vs-account.md, DEVLOG.md, copy-voice.md, outreach/
```

## Related

- [`../easywed-video`](../easywed-video): marketing films (walkthroughs, Reels/TikTok cuts, landing-page loops) built with [Remotion](https://remotion.dev). They redraw the real UI from this app's `pl.json` / `en.json` strings and render in either language through `REMOTION_LANG`. Briefs live in `easywed-video/docs/video-plans/`.
- Claude Code skills in the repo root's `.claude/skills/`: `video-plan` and `video-build` (Remotion films), and `plan-slide` and `ig-carousel` (Instagram posts made from planner screenshots).

## Docs

- [`CLAUDE.md`](./CLAUDE.md): architecture notes (data flow, roles, RLS tripwires, routing quirks)
- [`docs/supabase.md`](./docs/supabase.md): schema, policies, the venue role, CLI flow
- [`docs/guest-vs-account.md`](./docs/guest-vs-account.md): guest vs signed-in feature matrix
- [`docs/DEVLOG.md`](./docs/DEVLOG.md): development log
