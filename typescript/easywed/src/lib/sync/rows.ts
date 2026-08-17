import type {
  Fixture,
  FixtureShape,
  Geometry,
  Hall,
  HallPreset,
  Seat,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"

/**
 * DB row -> store entity, for the three tables both load paths read.
 *
 * Extracted when `loadWeddingForVenue` arrived: it selects the same hall,
 * table and fixture columns as `loadWedding` and has to interpret them
 * identically, and the interesting parts here are not obvious enough to
 * duplicate. The `geometry` casts in particular need the `unknown` hop (see
 * `toJsonOrNull` in mutations/shared.ts for the inverse and why), and the
 * geometry <-> preset invariant below is a repair rule, not a mapping.
 *
 * Deliberately does *not* include guests. The venue path never reads that
 * table - it reads the `wedding_seatmap` view, whose projection has no name and
 * no note column - so there is no shared guest mapper to be tempted into
 * writing one.
 *
 * `resolveHallId` is the caller's orphan policy rather than a rule here:
 * `loadWedding` adopts orphans into the first hall *and repairs the rows*,
 * which a venue must never do, so the two paths pass different functions.
 */

/** Numeric columns arrive as `string | number` depending on the column type. */
type Numeric = number | string

export type HallRow = {
  id: string
  name: string
  floor: number | null
  preset: string
  width: Numeric
  height: Numeric
  pos_x: Numeric
  pos_y: Numeric
  geometry: unknown
}

export type TableRow = {
  id: string
  hall_id: string | null
  name: string
  shape: string
  capacity: number
  width: Numeric
  height: Numeric
  rotation: number
  pos_x: Numeric
  pos_y: Numeric
  geometry: unknown
  seats: unknown
}

export type FixtureRow = {
  id: string
  hall_id: string | null
  name: string
  shape: string
  width: Numeric
  height: Numeric
  rotation: number
  pos_x: Numeric
  pos_y: Numeric
  geometry: unknown
}

/**
 * Enforces the geometry <=> non-rectangle-preset invariant in both directions
 * at the load boundary. The DB CHECK guards it too; this covers rows that
 * predate the constraint - a polygon preset without geometry falls back to
 * rectangle, and a rectangle's stray geometry is dropped.
 */
export const toHall = (h: HallRow): Hall => {
  const geometry =
    h.preset !== "rectangle" ? (h.geometry as Geometry | null) : null

  return {
    id: h.id,
    name: h.name,
    floor: h.floor,
    preset: geometry ? (h.preset as HallPreset) : "rectangle",
    size: { width: Number(h.width), height: Number(h.height) },
    position: { x: Number(h.pos_x), y: Number(h.pos_y) },
    ...(geometry ? { geometry } : {}),
  }
}

export const toTable = (
  t: TableRow,
  resolveHallId: (hallId: string | null) => string
): Table => ({
  id: t.id,
  name: t.name,
  shape: t.shape as TableShape,
  capacity: t.capacity,
  size: { width: Number(t.width), height: Number(t.height) },
  rotation: t.rotation as TableRotation,
  position: { x: Number(t.pos_x), y: Number(t.pos_y) },
  hallId: resolveHallId(t.hall_id),
  ...(t.geometry ? { geometry: t.geometry as Geometry } : {}),
  seats: (t.seats as Array<Seat> | null) ?? [],
})

export const toFixture = (
  f: FixtureRow,
  resolveHallId: (hallId: string | null) => string
): Fixture => ({
  id: f.id,
  name: f.name,
  shape: f.shape as FixtureShape,
  size: { width: Number(f.width), height: Number(f.height) },
  rotation: f.rotation as TableRotation,
  position: { x: Number(f.pos_x), y: Number(f.pos_y) },
  hallId: resolveHallId(f.hall_id),
  ...(f.geometry ? { geometry: f.geometry as Geometry } : {}),
})
