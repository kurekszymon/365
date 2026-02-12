# react 19

playground for anything react.

- build it and use from `../electron`
- check posthog

## 11.02

- export functionality: JSON, Markdown, Plain Text (single note or all notes)
- **refined export format**: images use numbered references (`$img_1`, `$img_2`) instead of inline base64
- assets stored in separate section at end of file
- **import functionality**: JSON import with file picker, validates and resolves image refs
- comprehensive docs in `/src/lib/export.ts` explaining the numbered reference system

todo:

- split css file to react components so main bundle wouldnt be that big

## 10.02

- add lazy loading for routes
- added canvas drawing support to notes (pen, eraser, colors, brush sizes, undo/redo)
- drawings stored as base64 PNG in localStorage alongside note content
  todo:
- add proper skeletons for loading state
- investigate why main file is still 500kb (realized it's probably because css)

## 09.02

- used claude sonnet (and opus later, after quality went downhill) to migrate from local state to zustand.
- refresh state between the tabs with broadcast channel and reloading state from local storage
- removed some markdown files i initially omitted in yesterday's claude fiesta
- used discriminated union to have typesafety in payloads

i sometimes wonder how people are able to use 10 agents at once if one is able to generate so much mess

## 08.02

used claude to generate a notes app to better test posthog.

identified issues (3k lines added have to have some issues)

- electron app now won't open desktop app or show messages from main process (claude removed code)

<!--Claude sonnet -->

Created a full-featured **Notes App** with:

- TanStack Router for type-safe routing
- Complete note-taking functionality (CRUD operations)
- BroadcastChannel API for real-time cross-tab sync
- PostHog analytics tracking all user interactions
- Tag system for organization
- Search and filter capabilities
- LocalStorage persistence
- Modern, responsive UI with dark mode support

**Key Files:**

- `/src/routes/` - File-based routing with TanStack Router
- `/src/lib/broadcast.ts` - BroadcastChannel manager for cross-tab communication
- `/src/lib/notes.ts` - Notes storage and management
- `/src/lib/tracking.ts` - PostHog event tracking utilities
- `/src/lib/seedData.ts` - Sample notes for testing

<!--/Claude sonnet -->

## 07.02

- install and check posthog

## earlier (without "journal")

- setup, compile for electron to open app from web
