import type { FixtureShape, Size, TableShape } from "@/stores/planner.store"

export type TablePreset = {
  key: string
  shape: TableShape
  size: Size
  capacity: number
  labelKey: string
  // Picker-card preview only — "oval" renders a pill-shaped swatch to hint at
  // the shape, but the inserted table is a plain `rectangular` table like
  // Prostokąt (the schema has no oval shape), so it's editable via the normal
  // rectangular-table fields afterwards with no special-casing anywhere else.
  preview: "round" | "rect" | "oval"
}

export const TABLE_PRESETS: Array<TablePreset> = [
  {
    key: "round-8",
    shape: "round",
    size: { width: 1.5, height: 1.5 },
    capacity: 8,
    labelKey: "tables.preset.round_8",
    preview: "round",
  },
  {
    key: "rect-6",
    shape: "rectangular",
    size: { width: 1.8, height: 0.8 },
    capacity: 6,
    labelKey: "tables.preset.rect_6",
    preview: "rect",
  },
  {
    key: "oval-10",
    shape: "rectangular",
    size: { width: 2.4, height: 1 },
    capacity: 10,
    labelKey: "tables.preset.oval_10",
    preview: "oval",
  },
]

export type FixtureIcon =
  | "stage"
  | "dance_floor"
  | "bar"
  | "dj_booth"
  | "entrance"
  | "custom"

export type FixturePreset = {
  key: string
  shape: FixtureShape
  size: Size
  labelKey: string
  icon: FixtureIcon
  // "Custom" has no sensible single default size/shape — tapping it opens the
  // full fixture add form instead of inserting this preset directly.
  custom?: boolean
}

export const FIXTURE_PRESETS: Array<FixturePreset> = [
  {
    key: "stage",
    shape: "rectangle",
    size: { width: 3, height: 1.5 },
    labelKey: "fixtures.preset.stage",
    icon: "stage",
  },
  {
    key: "dance-floor",
    shape: "rectangle",
    size: { width: 3, height: 3 },
    labelKey: "fixtures.preset.dance_floor",
    icon: "dance_floor",
  },
  {
    key: "bar",
    shape: "rectangle",
    size: { width: 2.5, height: 1 },
    labelKey: "fixtures.preset.bar",
    icon: "bar",
  },
  {
    key: "dj-booth",
    shape: "rectangle",
    size: { width: 1.5, height: 1 },
    labelKey: "fixtures.preset.dj_booth",
    icon: "dj_booth",
  },
  {
    key: "entrance",
    shape: "rounded",
    size: { width: 1, height: 0.3 },
    labelKey: "fixtures.preset.entrance",
    icon: "entrance",
  },
  {
    key: "custom",
    shape: "rectangle",
    size: { width: 1, height: 1 },
    labelKey: "fixtures.preset.custom",
    icon: "custom",
    custom: true,
  },
]
