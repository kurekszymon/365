# EasyWed — Development Log

Running log of what's been built, decisions made, and what comes next.
Update this file after every significant session.

---

## 2026-03-24 — Hall preview door rendering fix

### Fixed

- **Hall preview doors invisible** — `HallPreview` was using `hsl(var(...))` CSS custom property syntax in SVG `fill`/`stroke` attributes, which is not supported outside stylesheets (same class of bug previously fixed in `HallOverlay`). Replaced with explicit hex colors (`#334155` for walls, `#b45309` for door gaps, `#f8fafc` for floor fill).
- **Door width calculation used hardcoded ppm** — door gap width in the preview was computed with a magic `80` instead of the actual `pixelsPerMeter` value, causing incorrect gap sizes when scale differed from the default. Now uses `d.widthM * ppm * s` (actual ppm scaled to preview).
- **Preview rendered doors as overlaid lines, not wall gaps** — rewrote `HallPreview` to use the same wall-segmentation approach as `HallOverlay`: each wall is split into solid segments with dashed amber gaps where doors sit, rather than drawing a separate line on top of a solid wall. `ppm` is now passed as a prop.

---

## 2026-03-23 — Wedding hall builder, configurable table & chair sizes, UX polish

### Added

- **Persistent viewport** — canvas pan position and zoom level are saved to `localStorage` (`easywed_planner_viewport` key) and restored on page load. No more losing your place after a refresh.
- **Automatic snap-to-grid** — when a hall is configured, tables automatically snap to the 1 m grid. Removed the manual snap toggle button from the toolbar since it's always desirable with a hall.
- **Wedding hall polygon** — organizer can define the physical shape of their venue as a polygon on the canvas. Supports preset shapes (Rectangle, L-shape, U-shape) with meter-based dimension inputs, and a **Custom** mode where vertices are drawn by clicking on a grid. The hall is rendered as an SVG overlay with:
  - **Dimmed exterior** — everything outside the polygon is grayed out so the usable area is clear.
  - **Walls** — polygon edges drawn as thick lines. Walls with doors render solid segments separated by dashed door gaps.
  - **Meter grid** — 1 m gridlines inside the hall (clipped to polygon).
  - **Dimension labels** — width × height shown along the edges.
- **Doors** — organizer can add doors on any wall segment, specifying wall index, position along the wall (0–1), and width in meters. Doors appear as dashed highlighted gaps in the wall.
- **Configurable table size** — `AddTableDialog` now includes size inputs (diameter for round, width × height for rectangular) in meters. Tables render at their specified pixel size instead of the old hard-coded CSS dimensions.
- **Configurable chair size** — chair diameter (meters) set in the Hall Setup dialog. Chairs render as small circles around each table: evenly distributed in a circle for round tables, evenly around the perimeter for rectangular tables. Seated chairs get a primary-color fill; empty chairs are muted.
- **Hall boundary constraint** — tables cannot be dragged outside the hall polygon. The `updateTable` action checks point-in-polygon (ray-casting) on the table center before accepting a move.
- **Scale system** — `pixelsPerMeter` (default 80) converts between real-world meters and canvas pixels. Displayed in the Hall Setup dialog; all size inputs use meters.
- **HallSetupDialog** — full configuration dialog with preset shape picker (pill-style toggle buttons), dimension inputs per preset, custom polygon editor with clickable vertex grid, door list management, scale (px/m) and chair size controls, and live SVG preview.
- **HallOverlay** — SVG component rendered behind tables on the canvas, scales with pan/zoom.

### Fixed

- **Table clipping for all hall shapes** — the old constraint only checked the table's center against the polygon, allowing edges and chairs to escape. Now checks all 4 corners of the table's expanded footprint (including chair overflow) against the actual polygon. Uses bounding-box clamping for smooth wall sliding on outer edges, plus per-axis binary search (10 iterations, sub-pixel precision) for concave cut-outs (L/U shapes), so tables hug walls tightly on all sides.
- **Zoom to cursor** — mouse wheel zoom now keeps the point under the cursor fixed instead of zooming toward the top-left corner.
- **Snap grid too coarse** — snap was at 1 m (80 px), causing visible jumps. Reduced to 1/4 m (20 px) for smooth movement while staying aligned.

### Changed

- **`PlannerTable` type** — added `widthPx` and `heightPx` fields. Round tables default to 160×160 px, rectangular to 184×80 px (matching previous hard-coded CSS).
- **`PlannerState` type** — added `hall: HallConfig | null` and `chairSizePx: number` fields. Version stays at 1 (app not deployed yet).
- **`PlannerTableCard`** — renders at dynamic `width`/`height` from table data instead of fixed CSS classes. Renders chair SVG layer around each table.
- **`PlannerToolbar`** — added "Hall" button (Landmark icon), highlighted when a hall is configured. Removed snap toggle (now automatic).
- **`usePlanner` hook** — added `updateHall`, `addDoor`, `removeDoor`, `updateChairSize` actions. `updateTable` constrains tables inside hall polygon with chair-aware bounding.
- **`PlannerCanvas`** — snap is automatic at 1/4 m when hall exists. Viewport (pan/scale) persisted to localStorage. Zoom targets cursor position.
- **`PlannerTable`** — removed `Math.max(0, ...)` position clamp (now handled by `updateTable`).
- **`storage.ts`** — added `Viewport` type, `saveViewport`, `loadViewport` helpers.
- **`usePlanner.updateTable`** — added bounding-box clamping via `getPolygonBounds` before the center-in-polygon check.
- **`storage.ts`** — added `Viewport` type, `saveViewport`, `loadViewport` helpers.

### New types

```
HallPoint { x, y }                     — polygon vertex in canvas pixels
HallDoor { id, wallIndex, position, widthM } — door on a wall segment
HallConfig { points, doors, pixelsPerMeter, preset }
HallPreset = "rectangle" | "l-shape" | "u-shape" | "custom"
```

### New files

```
src/components/planner/HallSetupDialog.tsx  — hall configuration dialog
src/components/planner/HallOverlay.tsx      — SVG hall rendering on canvas
```

### Geometry helpers (in types.ts)

- `generateRectangleHall`, `generateLShapeHall`, `generateUShapeHall` — preset polygon generators
- `isPointInPolygon` — ray-casting point-in-polygon test
- `isRectInPolygon` — checks if an axis-aligned rectangle is fully inside a polygon
- `getPolygonBounds` — bounding box of a polygon

### Decisions made

- **Polygon-based hall shape** — allows arbitrary shapes (L, U, T, custom) with a single unified data model. Walls = polygon edges, doors = gaps in edges.
- **Pixels as the internal coordinate system** — hall points, table positions, and sizes are all stored in pixels. Meters are a display unit converted via `pixelsPerMeter`. This keeps backward compatibility and avoids floating-point coordinate drift.
- **Center-point constraint** — only the table center is checked against the polygon (not all four corners). This is forgiving enough to let tables sit near walls without being impossible to place, while still preventing tables from being dragged fully outside.
- **Chair rendering via SVG** — chairs are an SVG layer rendered as a sibling of the table card. They expand the visual bounding box but don't affect pointer events or drop targets.
- **No version bump** — app is not deployed, so no migration needed. Version stays at 1.

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
