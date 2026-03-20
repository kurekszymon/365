# Session Replay – Product Requirements Document

## 1. What We Are Building

A self-hosted session replay platform similar to PostHog's session replay feature.
It captures everything a user does in a browser (DOM mutations, mouse movements, clicks, scrolls, network errors) and lets you play it back like a video.

Core components:

```
[Consumer Website]
  └── tracker.js (injected script)
        │  batches events
        └──► [Fastify Backend]
                │  validates API key → attributes to project
                │  stores replay chunks
                └──► [PostgreSQL via Prisma]

[Dashboard / Replay Viewer]  ← reads from backend, plays back via rrweb-player
```

---

## 2. Key Technology: rrweb

Do **not** reimplement DOM capture from scratch. Use [rrweb](https://github.com/rrweb-io/rrweb).

rrweb works in two parts:
- **`rrweb` (recorder)** – included in the injected tracker script. Serializes the full DOM on start (full snapshot), then emits incremental events for every mutation (MutationObserver), mouse move, click, scroll, viewport resize, etc.
- **`rrweb-player`** – used in the viewer dashboard to reconstruct and play back the session from the stored events.

PostHog, LogRocket, and Hotjar all use rrweb (or a fork of it) under the hood.

---

## 3. How the Tracker Script Works

### 3.1 Initialization

The consumer embeds a snippet in their HTML:

```html
<script>
  (function(w,d,s,k){
    w.__rr=w.__rr||{q:[]};
    w.__rr.apiKey=k;
    var el=d.createElement(s);
    el.src='https://your-backend.com/tracker.js';
    el.async=true;
    d.head.appendChild(el);
  })(window, document, 'script', 'YOUR_API_KEY');
</script>
```

Or after self-hosting `tracker.js`:

```html
<script src="/tracker.js" data-api-key="YOUR_API_KEY" async></script>
```

### 3.2 What the tracker does on load

1. **Reads the API key** from `data-api-key` attribute or `window.__rr.apiKey`.
2. **Generates or restores IDs**:
   - `anonymousId` – UUID stored in `localStorage` (survives across sessions, ties sessions to one device/browser).
   - `sessionId` – UUID stored in `sessionStorage` (new per tab/visit).
3. **Calls POST `/api/sessions`** to register the session (sends `apiKey`, `anonymousId`, `sessionId`, page URL, user agent, screen dimensions).
4. **Starts rrweb recording** – `rrweb.record({ emit(event) { ... } })`.
5. **Batches events** – collects emitted events in a local buffer.
6. **Flushes the buffer** every 5 seconds or when `visibilitychange` / `beforeunload` fires, by calling `POST /api/sessions/:sessionId/chunks`.
7. **Exposes `window.sessionReplay.identify(userId, traits)`** for optional user identification.

### 3.3 Privacy controls (important)

rrweb supports masking:
- `maskAllInputs: true` – replaces input values with `*`.
- `blockClass: 'rr-block'` – consumer can mark elements to block from capture.
- `ignoreClass: 'rr-ignore'` – ignores mouse events on elements.

These should be configurable via the init options.

---

## 4. API Key & Project System

Every customer (organization) gets one or more **Projects**. Each project has a unique **API key**.

Flow:
1. Organization registers → creates an Org.
2. Org creates a Project (e.g., "My Marketing Site").
3. Backend generates a random API key for that project.
4. Consumer embeds the key in their site.
5. Every request from the tracker includes the API key → backend resolves it to a Project.

The API key is **not a secret** (it lives in public JS), so it should only allow data ingestion, not data reads. Dashboard access is protected by authentication.

---

## 5. Database Schema

Replace the current placeholder schema with this:

```prisma
// Organization (customer account)
model Organization {
  id        String    @id @default(cuid())
  name      String
  createdAt DateTime  @default(now())
  projects  Project[]
}

// Project = one tracked website/app
model Project {
  id             String    @id @default(cuid())
  organizationId String
  name           String
  apiKey         String    @unique @default(cuid())
  createdAt      DateTime  @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
  sessions       Session[]
}

// One session = one page visit (or SPA session)
model Session {
  id          String    @id  // client-generated UUID
  projectId   String
  anonymousId String          // device-level ID from localStorage
  userId      String?         // set after identify() call
  userTraits  Json?           // { name, email, plan, ... }
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  durationMs  Int?
  pageUrl     String
  referrer    String?
  userAgent   String?
  screenW     Int?
  screenH     Int?
  country     String?         // derived from IP at ingestion time
  city        String?
  chunkCount  Int       @default(0)
  project     Project   @relation(fields: [projectId], references: [id])
  chunks      ReplayChunk[]
  pageViews   PageView[]
}

// Raw rrweb event batches — stored as compressed JSONB
model ReplayChunk {
  id        String   @id @default(cuid())
  sessionId String
  seq       Int                   // chunk sequence number, for ordering
  timestamp DateTime              // timestamp of the first event in the chunk
  events    Json                  // raw rrweb events array
  byteSize  Int?                  // uncompressed size for storage tracking
  session   Session  @relation(fields: [sessionId], references: [id])

  @@index([sessionId, seq])
}

// SPA page navigations within a session
model PageView {
  id        String   @id @default(cuid())
  sessionId String
  url       String
  timestamp DateTime
  session   Session  @relation(fields: [sessionId], references: [id])
}
```

### Storage note

rrweb events are verbose JSON. For production, consider:
- Storing chunks as compressed binary (gzip). PostgreSQL `bytea` or a blob store (S3/R2) referenced by URL.
- The schema above uses `Json` (JSONB in Postgres) which works fine for prototyping.

---

## 6. Backend API Endpoints

All ingestion endpoints are public (validated by API key). Dashboard endpoints require auth.

### 6.1 Ingestion (called by tracker.js)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ingest/sessions` | Create or upsert a session |
| `POST` | `/api/ingest/sessions/:sessionId/chunks` | Append replay event batch |
| `POST` | `/api/ingest/sessions/:sessionId/identify` | Attach userId + traits |
| `POST` | `/api/ingest/sessions/:sessionId/pageview` | Record SPA navigation |
| `PATCH` | `/api/ingest/sessions/:sessionId/end` | Mark session ended (duration) |

All requests include `X-API-Key: <key>` header. A Fastify plugin validates this and attaches `request.project` to the context.

### 6.2 Dashboard (requires auth — add later)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects/:projectId/sessions` | List sessions (paginated, filterable) |
| `GET` | `/api/sessions/:sessionId` | Session metadata |
| `GET` | `/api/sessions/:sessionId/chunks` | All chunks ordered by seq |

### 6.3 Assets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tracker.js` | Serve the built tracker script |

---

## 7. Tracker Script Build

The tracker is a separate build artifact — a self-contained JS bundle served from the backend (or a CDN).

### 7.1 Tech stack

- **Bundler**: Vite (library mode) or esbuild — outputs a single `tracker.js` file.
- **Dependencies bundled in**: `rrweb` (recorder only, not player).
- **Target**: ES2017+, no framework.
- **Output size**: aim for < 60 KB gzipped (rrweb core is ~50 KB).

### 7.2 Directory structure

```
typescript/
  replays/
    backend/          ← Fastify + Prisma (existing)
    tracker/          ← tracker script source
      src/
        index.ts      ← entry point
        session.ts    ← session ID management
        sender.ts     ← batching + HTTP flush
        identify.ts   ← identify() API
      package.json
      vite.config.ts  ← builds to ../backend/public/tracker.js
    viewer/           ← replay viewer SPA (Phase 3)
      src/
        ...
```

### 7.3 Tracker entry point sketch

```typescript
// tracker/src/index.ts
import * as rrweb from 'rrweb';
import { getOrCreateIds } from './session';
import { Sender } from './sender';

const script = document.currentScript as HTMLScriptElement | null;
const apiKey = script?.dataset.apiKey ?? (window as any).__rr?.apiKey;

if (!apiKey) {
  console.warn('[SessionReplay] No API key found.');
} else {
  const { anonymousId, sessionId } = getOrCreateIds();
  const sender = new Sender({ apiKey, sessionId, endpoint: 'https://your-backend.com' });

  sender.createSession({
    anonymousId,
    pageUrl: location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    screenW: screen.width,
    screenH: screen.height,
  });

  rrweb.record({
    emit(event) { sender.push(event); },
    maskAllInputs: true,
  });

  (window as any).sessionReplay = {
    identify: (userId: string, traits?: object) => sender.identify(userId, traits),
  };
}
```

### 7.4 Batching logic (Sender)

```
push(event)
  → add to buffer[]
  → if buffer.length >= 50 OR time since last flush > 5s → flush()

flush()
  → POST /api/ingest/sessions/:sessionId/chunks
       body: { events: buffer, seq: seqCounter++ }
  → clear buffer

visibilitychange (hidden) → flush()
beforeunload → flush() + PATCH /end
```

Use `navigator.sendBeacon` for the unload flush (it survives page close).

---

## 8. Implementation Roadmap

### Phase 1 — Backend Foundation (Week 1)

- [ ] Replace schema.prisma with the new schema above
- [ ] Run `prisma migrate dev`
- [ ] Implement API key validation Fastify plugin
- [ ] `POST /api/ingest/sessions` — create session
- [ ] `POST /api/ingest/sessions/:id/chunks` — store chunks
- [ ] `PATCH /api/ingest/sessions/:id/end` — finalize session
- [ ] `POST /api/ingest/sessions/:id/identify` — attach user
- [ ] `GET /tracker.js` — serve static file
- [ ] Basic seed script: create one Org, one Project, one API key

### Phase 2 — Tracker Script (Week 1–2)

- [ ] Create `tracker/` directory with Vite + TypeScript setup
- [ ] Implement session ID management (localStorage / sessionStorage)
- [ ] Implement rrweb recording
- [ ] Implement Sender with batching + sendBeacon on unload
- [ ] Build script outputs to `backend/public/tracker.js`
- [ ] Test in a local HTML page

### Phase 3 — Replay Viewer (Week 2–3)

- [ ] Create `viewer/` React or Svelte app
- [ ] `GET /api/sessions` list page — table of sessions with metadata
- [ ] `GET /api/sessions/:id` detail page — fetch chunks, reconstruct with `rrweb-player`
- [ ] Playback controls: play/pause, scrub timeline
- [ ] Show page URL, duration, device info in sidebar

### Phase 4 — Organization & Auth (Week 3–4)

- [ ] Register/login endpoints (JWT or session cookie)
- [ ] Org/Project CRUD
- [ ] API key rotation
- [ ] Protect dashboard endpoints behind auth middleware

### Phase 5 — Polish & Advanced Features (Week 4+)

- [ ] Rage click detection (rrweb emits click events → detect N clicks in M ms on same target)
- [ ] Dead click detection (click with no DOM response)
- [ ] SPA navigation tracking (`POST /pageview`)
- [ ] IP geolocation at ingestion (use `geoip-lite` npm package)
- [ ] Session search & filtering (by user, URL, duration, date)
- [ ] Chunk compression (gzip before storing in DB or move to S3)
- [ ] Heatmap aggregation from click events

---

## 9. Immediate Next Steps

1. **Update `schema.prisma`** — drop the User/Post/Comment placeholder models and add the new session replay schema.
2. **Create the API key plugin** — Fastify preHandler that reads `X-API-Key`, looks up the Project, and attaches it to `request`.
3. **Create the ingestion routes** — thin controllers that write to Prisma.
4. **Bootstrap the tracker project** — `pnpm create vite tracker --template vanilla-ts`, add rrweb.
5. **Test end-to-end** — open a local HTML file with the tracker, watch chunks appear in the DB.

---

## 10. Questions to Settle Before Coding

| Question | Default recommendation |
|----------|----------------------|
| Multi-tenant from day one? | Yes — schema supports Org → Project → Session |
| Auth system for dashboard? | Start with a hardcoded admin token; add proper auth in Phase 4 |
| Where to store large replays? | PostgreSQL JSONB is fine to start; migrate to S3/R2 if rows > 100 KB |
| How to serve tracker.js? | Static file from Fastify `@fastify/static`; move to CDN later |
| SPA support? | Yes — pageview events track navigation within a session |
| Mobile / React Native? | Out of scope for now; rrweb is web-only |
