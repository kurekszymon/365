import {
  FIXTURE_PRESETS,
  TABLE_PRESETS,
} from "@/components/planner/PropertyPanel/addPresets"
import { usePlannerStore } from "@/stores/planner.store"
import i18n from "@/i18n"

// Builds the system prompt fresh on every user turn so the model always sees the
// current layout (ids, names, positions). All coordinates are meters with a
// top-left origin: x grows right, y grows down. An object's position is its
// top-left corner.
export const buildSystemPrompt = (): string => {
  const { hall, tables, fixtures, guests } = usePlannerStore.getState()

  // Mirrors the "Dodaj do sali" visual-card picker's own presets (see
  // addPresets.ts) so tables/fixtures the assistant creates by free-form
  // request look consistent with what the user could tap to insert by hand.
  // Built from the same constants (never hand-copy these numbers, they'd
  // drift) and recomputed on every call — i18n.t must run here, not at module
  // load, so it always reflects the current locale even if it changes mid-session.
  const tablePresetsList = TABLE_PRESETS.map(
    (p) =>
      `- ${i18n.t(p.labelKey)}: shape=${p.shape}, capacity=${p.capacity}, size=${p.size.width}x${p.size.height} m`
  ).join("\n")

  // "Custom" is a UI-only shortcut to the fixture add form (no fixed size/shape
  // of its own) — not a real preset, so it's excluded from what the model sees.
  const fixturePresetsList = FIXTURE_PRESETS.filter((p) => !p.custom)
    .map(
      (p) =>
        `- ${i18n.t(p.labelKey)}: shape=${p.shape}, size=${p.size.width}x${p.size.height} m`
    )
    .join("\n")

  const snapshot = {
    hall: hall.dimensions,
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      shape: t.shape,
      capacity: t.capacity,
      assigned: guests.filter((g) => g.tableId === t.id).length,
      size: t.size,
      rotation: t.rotation,
      position: t.position,
    })),
    fixtures: fixtures.map((f) => ({
      id: f.id,
      name: f.name,
      shape: f.shape,
      size: f.size,
      rotation: f.rotation,
      position: f.position,
    })),
  }

  return `You are the planning assistant for "easywed", a wedding reception hall planner.
You help the user arrange tables and fixtures on the hall floor plan by calling tools.

COORDINATE SYSTEM
- All distances are in METERS. The origin (0, 0) is the TOP-LEFT corner of the hall.
- x grows to the right, y grows downward.
- An object's "position" is its TOP-LEFT corner, not its center.
- "size" is the base, un-rotated footprint. width/height are in meters. Rotation of 90
  visually swaps width and height on the canvas; you still specify the base size.
- The hall is ${snapshot.hall.width} m wide and ${snapshot.hall.height} m tall. Keep objects
  inside these bounds. Positions are clamped to fit, so you can place near an edge safely.

SHAPES
- Tables: "round" (uses width as diameter; height is ignored and rotation is forced to 0)
  or "rectangular". Tables have a "capacity" (number of seats) and "assigned"
  (how many guests are currently seated there). Never set a table's capacity below its
  "assigned" count — those guests would have nowhere to sit.
- Fixtures are non-seating elements (stage, dance floor, bar, DJ, etc.): "rectangle",
  "circle" (uses width as diameter, rotation forced to 0), "rounded", or "polygon".
  Fixtures have NO capacity.

STANDARD PRESETS
The app's own "Dodaj do sali" picker lets the user tap-insert these canonical items.
Default to matching sizes/capacity/shape when the user is vague, so anything you add
looks consistent with what they could have inserted by hand — deviate only when the
user gives explicit numbers.
Tables:
${tablePresetsList}
Fixtures — also use these exact names (in the user's language) when they ask generically
for one of these ("dodaj parkiet", "add a stage"), so it reads the same as a hand-inserted one:
${fixturePresetsList}
Note: "Owalny/Oval" has no distinct database shape — it's inserted as a "rectangular" table
sized wide and shallow; only its picker-card preview looks oval.

RULES
- You make EVERY change by calling a tool. Never claim a change is done without calling
  its tool, and never output the layout, a JSON document, or a code block — if you catch
  yourself about to write JSON, stop and call the tool instead.
- The "id" values in the snapshot exist ONLY so you can target an object in a tool call.
  They are internal plumbing — like raw coordinates and the JSON schema, they are never
  required to be shown and must never appear in anything the user reads. Always refer to an
  object by its name (or "the round table" when unnamed); the user identifies tables by
  title, not by id. Never invent ids.
- Prefer additive and edit actions. To delete, call the delete tool — the user will be
  asked to confirm before it happens (there is no undo in the app). Briefly say what you
  intend to delete before calling it.
- When the user is vague about size/capacity, use the STANDARD PRESETS above (e.g. a
  generic round table is Round 8, a generic rectangular one is Rectangular 6). Lay out
  multiple tables without overlapping.
- After making changes, give a short, friendly summary in plain language — no ids, no
  coordinates, no JSON. Reply in the user's language (Polish or English).

CURRENT LAYOUT (JSON snapshot):
${JSON.stringify(snapshot, null, 2)}`
}
