# EasyWed — Development Log

Running log of what's been built, decisions made, and what comes next.
Update this file after every significant session.

---

## 2026-03-22 — DnD fixes, dietary multi-select, list view improvements

### Fixed

- **Scroll wheel zoom not working** — React attaches `onWheel` listeners as passive, so `e.preventDefault()` was silently ignored and the page still scrolled. Replaced with a `useEffect` that attaches the handler via `addEventListener('wheel', ..., { passive: false })`.
- **Import validation missing guests array check** — `importFromJSON` now validates `parsed.guests` is an array in addition to `parsed.tables`.
- **List view action buttons causing layout shift** — edit/delete buttons used `hidden group-hover:flex` which removed them from layout entirely. Changed to `opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto` so space is always reserved and the row doesn't shift when the dropdown opens or hover is lost.

### Changed

- **`dietary` changed from `Dietary` (single) to `Dietary[]` (array)** — a guest can now have multiple restrictions (e.g. vegan + gluten-free). Removed `"none"` from the union; empty array = no restrictions.
- **List view guest rows** now show all dietary badges (one per restriction) inline under the guest name, matching sidebar behaviour.
- **Canvas table initials** color uses the first restriction in the array; muted if none — no abstraction needed, inlined at point of use.

### Added

- **List view: reassignment dropdown** (PRD §4.5) — each seated guest row has a `<Select>` showing all tables, pre-selected to the current one (full tables disabled). Unassigned guests get an "Assign…" picker. Selecting "Unassign" from the dropdown unassigns the guest.
- **`AddGuestDialog`: toggle-pill multi-select** for dietary restrictions — each option is a toggleable pill styled with its restriction colour; inactive pills are outlined. Replaces the single `<Select>`.

---

## 2026-03-21 — Project bootstrap, Table Planner, DnD + round tables

### What was done

- **DnD drop detection broken when tables not at origin** — dnd-kit caches droppable rects from the element's layout position, ignoring `transform: translate(x, y)` on table cards. Replaced built-in collision detection with a custom `liveRectCollision` function that calls `node.getBoundingClientRect()` live on every pointer-move frame, correctly accounting for all ancestor transforms (canvas pan + scale + table position).
- **Entire guest row is now draggable** (not just the grip handle icon). Click still works as assign-by-click via the `PointerSensor`'s `distance: 8` activation constraint — short movements are treated as clicks, longer ones as drags.
- Initialized project with TanStack Start + React 19 + TypeScript
- Added shadcn/ui (radix-nova style) + Tailwind CSS v4
- Wrote and agreed on PRD (`docs/PRD.md`)
- Built the full **Table Planner** feature (MVP scope, no auth/backend yet)
- Added drag-and-drop guest assignment via `@dnd-kit/core`
- Fixed round tables to render as true circles with guest initials inside

### What's in the planner

- **Canvas view** — pannable (drag empty space) + zoomable (scroll wheel), tables draggable via pointer events. Works on touch/mobile.
- **List view** — compact per-table guest list, toggle in toolbar.
- **Guest sidebar** — add/edit/delete guests with dietary tags. Drag grip handle to DnD onto a table, or click guest → click table to seat.
- **Round tables** — true 160×160px circle, shows name + capacity + up to 6 colored initial badges inside.
- **Rectangular tables** — card style with inline guest chips and per-guest unassign button.
- **Drop feedback** — blue ring on valid drop target, red ring if table is full.
- **Drag overlay** — floating pill with guest initial + name follows cursor while dragging.
- **Dialogs** — Add/Edit table (name, shape, capacity), Add/Edit guest (name, dietary, note), rename wedding.
- **Export: Print / PDF** — `window.print()` on a hidden `@media print` layout. No external lib — handles Polish/Unicode correctly.
- **Export: JSON** — downloads `.easywed.json` (full planner state: tables, guests, assignments, canvas positions). Machine-readable, restorable.
- **Import: JSON** — file picker to restore any exported state across devices.
- **Auto-save** — every state change is persisted to `localStorage`.

### Key files

```
src/lib/planner/types.ts          — PlannerState, PlannerTable, PlannerGuest, dietary enums
src/lib/planner/storage.ts        — localStorage, JSON export/import
src/hooks/usePlanner.ts           — state management hook
src/components/planner/           — all planner UI components
src/routes/planner/index.tsx      — route: /planner/
```

### Decisions made

- **PDF via browser print**, not jsPDF — simpler, no deps, correct Unicode for Polish names.
- **JSON as restore format** (`.easywed.json`) — version field (`version: 1`) included for future migrations.
- **No backend yet** — planner works fully offline with localStorage. Designed to sync to Supabase later with minimal changes (state shape matches planned DB schema).
- **Canvas table dragging**: custom pointer events, not dnd-kit — simpler, avoids conflict with dnd-kit's guest DnD.
- **dnd-kit sensors**: `PointerSensor` with `distance: 8` (clicks still fire), `TouchSensor` with `delay: 200` (prevents accidental drags on scroll).
- **Drag handle only** — `listeners` from `useDraggable` applied only to the grip icon, not the full row. Row clicks (select/edit/delete) coexist without interference.
- **`useDroppable` on table card** — dnd-kit correctly resolves `getBoundingClientRect()` through the canvas CSS transform (`translate + scale`), so drop detection works even when zoomed/panned.
- **Round table guests**: no inline unassign button inside the circle (too cramped). Use sidebar X button or list view instead.
- **`dropAnimation: null`** on `DragOverlay` — avoids a jarring snap-back animation on successful drop.
- **shadcn components added**: `dialog`, `input`, `label`, `select`, `badge`, `dropdown-menu`, `separator`.

### Known issues / TODO before next session

- [ ] No confirmation dialog before deleting a table/guest with data
- [ ] Route: `/planner/` has trailing slash (TanStack Router file convention) — consider adding redirect from `/planner`

---

## Up Next

### Short term (next session)

- [ ] Auth — Supabase email/password + magic link
- [ ] Wedding creation flow — name, date, venue
- [ ] Persist planner state to Supabase (replace localStorage with DB)
- [ ] Multiple weddings per account

### Medium term

- [ ] Guest invitations — email via Resend, QR code generation
- [ ] RSVP flow — token-based, no account required
- [ ] Guest list dashboard with RSVP status
- [ ] Anonymization mode

### Long term / post-MVP

- [ ] Photo bucket (AWS S3 + CloudFront)
- [ ] Photo album curation + sharing
- [ ] Stripe payments (Per Wedding plan)
- [ ] i18n — Polish primary, English secondary
- [ ] SMS invitations (Twilio)
- [ ] Planner subscription plan
- [ ] "Find Your Seat" guest QR view
