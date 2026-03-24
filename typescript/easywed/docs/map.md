# EasyWed — Codebase Mind Map

## Overview

EasyWed is a **wedding table seating planner** — a client-side React app that lets couples visually arrange tables in a hall, manage a guest list, and assign guests to seats. All data lives in `localStorage`; there's no backend yet.

---

## Tech Stack

```
TanStack Start (React 19 + Vite + Nitro)
├── TanStack Router — file-based routing
├── Tailwind CSS v4 — styling
├── shadcn/ui (Radix UI) — UI primitives
├── @dnd-kit/core — drag-and-drop
├── Vitest + @testing-library/react — testing
└── Bun — package manager / lock file
```

---

## Directory Tree

```
src/
├── routes/                    # Pages (TanStack Router file-based)
│   ├── __root.tsx             # Root layout, devtools, 404
│   ├── index.tsx              # Landing page "/"
│   └── planner/index.tsx      # Main app "/planner"
│
├── components/
│   ├── planner/               # Feature components (see below)
│   └── ui/                    # shadcn primitives (button, dialog, badge …)
│
├── hooks/
│   └── usePlanner.ts          # ALL state management lives here
│
├── lib/
│   ├── planner/
│   │   ├── types.ts           # Domain types + geometry helpers
│   │   └── storage.ts         # localStorage + JSON import/export
│   └── utils.ts               # cn() classname helper
│
├── router.tsx                 # Router setup
├── routeTree.gen.ts           # Auto-generated (don't edit)
└── styles.css                 # Tailwind entry + CSS theme vars
```

---

## Feature Modules

### 1. Hall Configuration
**Where:** `HallSetupDialog.tsx`, `HallOverlay.tsx`, `types.ts`

**What:** Defines the shape of the wedding venue as a polygon. Users pick a preset (rectangle, L-shape, U-shape) or draw custom. They set real-world dimensions in meters and place doors on walls.

**Why:** The hall polygon is the bounding box — tables must stay inside it, doors are rendered on the canvas, and the grid snapping is derived from the pixels-per-meter ratio.

**Key types:** `HallConfig { points, doors, pixelsPerMeter, preset }`

---

### 2. Table Management
**Where:** `AddTableDialog.tsx`, `PlannerTable.tsx`, `usePlanner.ts`

**What:** Create/edit tables with name, shape (round or rectangular), capacity, and dimensions in meters. Tables are draggable on the canvas.

**Why:** Each table is the atomic unit of the seating plan. Position is stored as canvas pixels. Shape affects how chairs are drawn around it.

**Key types:** `PlannerTable { id, name, shape, capacity, x, y, widthPx, heightPx }`

---

### 3. Guest Management
**Where:** `AddGuestDialog.tsx`, `GuestSidebar.tsx`, `usePlanner.ts`

**What:** Add guests with name, optional notes, and one or more dietary restrictions (vegetarian, vegan, gluten-free, halal, kosher). Guests can be assigned to a table.

**Why:** Assignment links `PlannerGuest.tableId` to a `PlannerTable.id`. Unassigned guests appear in the sidebar; assigned guests appear on the table in the canvas.

**Key types:** `PlannerGuest { id, name, dietary, tableId, note? }`

---

### 4. Canvas (Interactive Floor Plan)
**Where:** `PlannerCanvas.tsx`, `PlannerTable.tsx`, `HallOverlay.tsx`

**What:** SVG + HTML canvas that renders the hall polygon and all tables. Supports:
- Pan via click-drag on empty space
- Zoom via mouse wheel
- Dragging tables (grid-snapped, collision-checked)
- Dropping guests from sidebar onto tables (via @dnd-kit)

**Why:** The canvas is the core UX — it's how couples visualize the physical room layout. Tables snap to a grid (pixelsPerMeter / 4) so everything aligns neatly.

**Key algorithms:**
- `isRectInPolygon()` — ensures tables stay inside the hall
- Binary-search wall-sliding — smooth resistance when dragging toward walls
- `liveRectCollision` — custom dnd-kit collision that reads live DOM rects (handles CSS transforms from pan/zoom)

---

### 5. List View
**Where:** `PlannerListView.tsx`

**What:** Tabular alternative to the canvas. Shows tables with their guests. Guests can be assigned/reassigned via a dropdown.

**Why:** Some users prefer managing assignments in a table rather than dragging on canvas — especially for large guest lists.

---

### 6. Print View
**Where:** `PlannerPrintView.tsx`

**What:** A hidden `@media print` layout that renders all tables and their guests in a clean, printer-friendly format. Triggered by Ctrl+P.

**Why:** Couples need a physical reference for the day-of. Canvas/list views are too interactive to print well.

---

### 7. State Management
**Where:** `usePlanner.ts`

**What:** Single custom React hook that holds the entire `PlannerState`. All mutations (add/update/delete for tables and guests, hall config, wedding name) are methods on this hook.

**Why:** No Zustand/Redux — the state is simple enough for a hook. Every state change auto-persists to `localStorage` via a `useEffect`.

**Root type:**
```ts
PlannerState {
  version: 1
  weddingName: string
  hall: HallConfig | null
  tables: PlannerTable[]
  guests: PlannerGuest[]
  chairSizePx: number
}
```

---

### 8. Persistence & Import/Export
**Where:** `storage.ts`

**What:**
- `saveToLocalStorage` / `loadFromLocalStorage` — JSON round-trip, called on every state change
- `saveViewport` / `loadViewport` — pan/zoom stored separately so it survives refreshes
- `exportAsJSON` — downloads `{weddingName}_seating.easywed.json`
- `importFromJSON` — parses and validates an uploaded file

**Why:** No backend, so localStorage is the only persistence. Export/import gives users a backup mechanism and lets them share plans.

---

### 9. UI Primitives
**Where:** `src/components/ui/`

**What:** Thin wrappers over shadcn/ui (Radix UI): `button`, `dialog`, `input`, `label`, `badge`, `select`, `dropdown-menu`, `separator`.

**Why:** Consistent, accessible primitives without hand-rolling them. Customized via Tailwind variants.

---

## Data Flow

```
usePlanner (state + mutations)
    │
    ├── PlannerToolbar      ← view toggle, import/export, add buttons
    ├── HallSetupDialog     ← updateHall()
    ├── AddTableDialog      ← addTable() / updateTable()
    ├── AddGuestDialog      ← addGuest() / updateGuest()
    │
    ├── PlannerCanvas       ← tables[], hall, drag handlers
    │   ├── HallOverlay     ← hall.points, hall.doors (SVG)
    │   └── PlannerTable    ← table, guests[], onMove()
    │
    ├── GuestSidebar        ← guests[], drag source
    ├── PlannerListView     ← tables[], guests[], assignGuest()
    └── PlannerPrintView    ← tables[], guests[] (print only)
```

---

## Routing

| Route | File | Purpose |
|-------|------|---------|
| `/` | `routes/index.tsx` | Landing page with link to planner |
| `/planner` | `routes/planner/index.tsx` | Full seating planner app |
| `*` | `routes/__root.tsx` | Root layout + 404 fallback |

---

## What's Not Yet Built (Backend Stub)

- **Nitro** is wired up but no API routes exist
- No authentication
- No cloud save/sync
- Collaboration (sharing plans) is not implemented

Everything is client-only via localStorage.
