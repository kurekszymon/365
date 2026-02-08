# react 19

playground for anything react.

- build it and use from `../electron`
- check posthog

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
