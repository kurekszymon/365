# EasyWed — Development Log

### 16.04

- added duplicate and delete table from the canvas - should probably populate it to property panel
- don't close property panel on table delete or click outside the hall

### 15.04

- match grid style buttongroup order with NEXT_GRID_STYLE in Canvas
- move SnapStep/GridStyle/GridSpacing to `planner.store.ts` instead of local variables. all modifications from hall / canvas are going through the store now.
- add grid style controls to property panel
- centralized canvas click + context-menu routing in `Canvas.tsx` via `findCapturedElement` / `captured.kind`:
  - `CanvasContextMenu` refactored from per-action props (`onAddTable`, `onEditTable`, `onConfigureHall`) into a `renderItems({ position, inHall })` render prop — the component is now just a trigger + content shell, Canvas owns all action logic
  - `DraggableTable` dropped `onSelect` / `isSelected` props; reads its own selection state from `panel.store` and selection clicks are handled by the outer canvas `onClick` via `captured.kind === "table"`
  - `HallSurface` dropped `onTableClick` / `selectedTableId` pass-through
  - tightened `CapturedElement` into a discriminated union (`{ kind: "table"; id: string } | { kind: "hall" }`) so `captured.id` is narrowed by `kind` — dropped `captured.id!` / null guards
  - narrowed `DraggableTable` selection selector to a boolean (`(s) => selectSelectedTableId(s) === table.id`) so only the newly-/previously-selected tables re-render on selection change
  - extracted `CanvasContextMenuItem` (shared menu-item className + variants) into its own file
  - stripped "Edit table" and "Configure hall" items from the canvas context menu — both are reachable via the property panel on left-click, so the menu is now just "Add Table". `CanvasContextMenu` no longer tracks `capturedElement`.

### 14.04

- replaced table shape select in panel with a two-option `ButtonGroup` (rectangular / round) for quicker toggling
- changed canvas context menu "Add Table" to optimistic flow: creates a table immediately at click position and opens table edit view right away
- default table created from context menu uses: empty `name`, `rectangular` shape, `8` capacity, and `2x1` size
- made table name optional in table form validation (empty name is now valid)
- added fallback table label when name is empty: `guestsAssigned / capacity` (used on canvas table chip + aria-label)
- applied the same unnamed-table fallback in guests panel section labels for consistency

### 13.04

**Property panel (replaced dialogs)**

- replaced `ConfigureHallDialog`, `AddTableDialog`, `EditTableDialog` with a slide-in `PropertyPanel` on the right side of the canvas
- panel state managed by `panel.store` (view discriminated union); `selectedTableId` derived via selector instead of stored separately
- hall panel applies changes immediately to the store (no local state / save-cancel flow)
- table panel works in add/edit modes; edit mode auto-applies on every field change
- guests panel groups guests by table assignment with droppable sections
- moved table field components (`TableNameField`, `TableShapeField`, etc.) from `dialogs/tables/` to `PropertyPanel/fields/`
- deleted dead code: `ConfigureHallDialog`, `AddTableDialog`, `EditTableDialog`, `TableDialog`, `useTableForm`, `Preview.tsx`, empty barrel files
- merged `updateHall`/`updateHallProperties` into single `updateHall` store action (callers reset zoom/pan explicitly)

**Guest drag-and-drop**

- lifted `DndContext` to `Planner.tsx` so canvas and panel share one drag context
- `DraggableTable` is now also a droppable — shows blue ring when a guest hovers over it
- `isDraggingGuest` tracked once in `HallSurface` via `useDndMonitor`, passed down to tables
- fixed: panel section highlights firing during table drags — gated `onDragOver` to `type === "guest"`
- fixed: `DragOverlay` ghost moving because transform applied to source — suppressed on source when dragging
- fixed: `setRef` in `DraggableTable` unstable reference — stabilised with `useCallback`

### 12.04

- replaced canvas-based hall preview in `ConfigureHall` with a real `HallSurface` render — deleted `canvas-utils.ts` entirely
- added `GridSpacing` type to `HallSurface`, alongside `GridStyle` and `SnapStep`
- nice derives meters from `width / ppm` and picks the nearest interval
- `gridSpacing` stored in `planner.store` on `hall` object (default `1m`), passed through `updateHall`; canvas reads it from store
- added grid spacing picker to `ConfigureHall` dialog — options `1m … 50m` + `auto` at the end (best for large halls), filter down options fitting the hall
- to think about - should grid be configurable from canvas or hall - probably from canvas?
- removed `Canvas/consts` file and moved it contents into `useHallGeometry` hook as it was only used there
- add disabled state for `Tables` trigger in Header

### 11.04

- added option to change background between dots / grid or completely disabled.
- replaced named type imports from 'react' with i.e. React.ReactNode
- added tl keys for grid/off/dots
- added possibility to snap tables to grid
- fixed `grid position` in HallSurface to center drawn grid size
- added snap step controls
- align hall configure button in header to other layout elements (should i hide tables when there is no hall?)
- used div instead of buttons for `DraggableTable` component

### 10.04

- clean up after ai - use shadcn's context menu instead of radix
- add option to edit a table on Table's context menu
- use `data-canvas-element-kind` and `data-canvas-element-id` to distinguish what was clicked on the canvas
- added `EditTableDialog` dialog, that uses same base as `AddTableDialog` utilizing `useTableForm` hook - maybe renmae to `useTableDialog` will see.
- changed number input fields to use `number` instead of `string`
- simplified `tables` transation keys
- renamed dialog.meta's spawnPosition to `position`
- split `Canvas.tsx` to smaller bits and pieces (`useCanvasPan`, `useCanvasZom`, `useHallGeometry`, `useLongPress`), use PointerHandler instead of Mouse + Touch for Canvas.

### 09.04

- right-click (or long-press on mobile) on the hall canvas shows a context menu with two actions:
  - "Add Table" — disabled when clicking outside hall bounds; table spawns at the clicked position
  - "Configure Hall" — always available regardless of click position
  - long-press detected via 500ms touch timer; cancels on move or release; fires synthetic `contextmenu` event to reuse the same menu on mobile
  - click position converted from viewport → hall coordinates, passed as `spawnPosition` through `dialog.store` meta into `addTable()`

### 08.04

- remove presets other than rectangle from `ConfigureHallDialog
- match `Preview` style with `Planner`, render tables (verify and simpify the code)

### 07.04

- added Tables.Add dialog
- added tooltip from shadcn
  - problematic part i found is that it needs `asChild` prop to work properly, need to do some research as to why. because of that (platform limitation), disabled button doesn't emit hover events so need to manually check the constraints.
- added guest assignment picker
- assign guests to table with capacity aware assignment
- added EN/PL translations for new flow.
- make user first configure hall before adding tables (improve the flow, appear tables button group as disabled)

### 06.04

- made text on canvas preview less blurry ([ref](https://stackoverflow.com/questions/15661339/how-do-i-fix-blurry-text-in-my-html5-canvas)), will make a 365/util out of it

### 05.04

- removed hall padding so the tables can be now matched with walls
- display `table.capacity` instead of plus icon on tables (change colors when full?)
- created seperate file for Canvas component, only reexport in barrel
- added 1m x 1m grid for planner, so it's possible to arrange tables with specified positions. (allow for moving the grid left/right? - commented out part responsible for that)

---

- removed old ai-generated planner with refactored one, missing features
  - export/import planner
  - print
  - list view

consider:

- adding a toolbox to planner view - little popup with
  - edit hall
  - add table
  - add obstacle (dj booth, photobooth, etc.)

---

### 04.04

- added planner component with DnD Context.
- tables are now movable inside the wedding hall, cannot go out of bounds
- all calculations are limited to rectangle hall shape (for now, for initial implementation)
- added seperate components for `DimensionLabel` (show size of the rectangle side), `DraggableTable` as well as utils and consts for Canvas Component
- seperate hook for `useElementSize`
- mocked tables for testing (follow up with create table dialog)
- hall is now centered and rendered as a preview, it is zoomable (0.2-4x) and it is possible to pan around the preview. Zoom and pan is reset when hall dimensions changes
- everything is stored in meters and recalculated for canvas (to verify)
- reset zoom and pan on scale pill click

### 03.04

- improvement for calendar to close on chosen date
- add empty state for planner
- store hall locally in ConfigureHallDialog and propagate to store on save
- place icons on the left for button with icons
- rename Dialog files to navigate around the code easier (amended commit to check if gpg key is working)

### 02.04

- improved Guest.Add dialog, add polish translation, save guests to zustand
- improved styles for smaller screens (show only icons, without text <md)
- Added <ButtonGroup> for Guests in `Planner` component.

### 01.04

- added Guest.Add Dialog

### 31.03

- added new `Hall.Configure` dialog
- added preview component to visualize hall dimensions (canvas, only limited to rectangle now)
- hook up preview component to `planner.store.ts`
- added and used translation strings for both English and Polish

### 30.03

- styled `RemindersPreview` little bit better
- used omitted translation for DatePicker placeholder
- extender reminder model to include `status`, `updatedAt` and `uuid`
- automatically close `CreateReminder` popover
- split `RemindersPreview` to smaller, self-contained components

### 29.03

- tweaks around dev setup with eslint (added react hooks plugin) and file structure renaming (stores/dialog.ts => stores/dialog.store.ts) as well as deflattening the structure little bit to reexport as default base components for routes (is there a name for it?), as in - `planner/index.tsx` => `planner/Planner.tsx`, `planner/index.tsx`
- created `Reminders` route and added a link from `reminders preview`
- made header component composable to ensure similarity between 'apps'
- extracted RemindersPreview to own component (WIP)

### 28.03 - WIP

- Split Header to smaller components, further split needed, it would be preferable to keep these separated component in the same file so it doesn't clutter the filesystem for jumping between files, but then it would clutter `Header.tsx` - need to think what's the best option here.
- Added `button-group` and `textarea` from shadcn, extended `datepicker` with custom translation keys for prompt and hid label based on the props.
- Setup `store/reminders` - need to create proper route for it
- Setup preview reminders from planner, can extract this component to reuse it across diferent part of application.
- removed redundant comments from `Header.tsx`

- ~~when to fix mobile view, it needs to be done at some point~~
- ~~fix TODOs left in `Nav.header.tsx` as well as in other parts of code~~
- ~~didn't finish with code split and reminders work due to lack of time~~

## 27.03

I noticed that some vulnerabilities are reported when run `bun audit`, although not all are immediately fixable,
i.e. [h3 version pinned by tanstack router](https://github.com/TanStack/router/issues/7043).

### done

- Added a "Welcome" dialog that only appears at the "first configuration" or when wedding name is not set. It's not perfect and it _should_ rely on DB of sorts and not zustand.
- Added a `DialogManager` that renders a dialog at a time, based on `DialogStore.opened` property. This way I don't need to worry about stale state between DialogStore updates and local state of dialogs, as well as I don't trash DOM with every dialog existing in the app.
- formatted and linted refactored part of the app - part generated by ai was added to `ignores` field of @tanstack/eslint-config.

### consider

- add precommit hooks for formatting and linting

## 26.03

After building a prototype I am happy with, I started to clean up the code to the point I feel good about maintaining it.

Started with project / structure setup and making some assumptions about the project based off a prototype.
I want to keep it simple for as long as possible as well as ofcourse try some new things, like `zustand`.

### done

- Set up a `planner-refactor` route to build a planner with less code and more maintainability.
- Set up zustand and small stores for `global` values, `planner` tied to Planner route and a `dialog` store to centralize dialog controls (like I mentioned in the comment in dialog store - I don't know particular caveats of using dialogs like this, so wanted to pick up my poison of this taste)
- Set up i18next for English and Polish language. Translate strings in refactoring part.
- add `Canvas.tsx` empty state.
