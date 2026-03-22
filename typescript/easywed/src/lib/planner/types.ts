export type TableShape = "round" | "rectangular"

export type Dietary =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "halal"
  | "kosher"

export interface PlannerTable {
  id: string
  name: string
  shape: TableShape
  capacity: number
  x: number
  y: number
}

export interface PlannerGuest {
  id: string
  name: string
  dietary: Dietary[]
  tableId: string | null
  note?: string
}

export interface PlannerState {
  version: 1
  weddingName: string
  tables: PlannerTable[]
  guests: PlannerGuest[]
}

export const EMPTY_STATE: PlannerState = {
  version: 1,
  weddingName: "My Wedding",
  tables: [],
  guests: [],
}

export const DIETARY_LABELS: Record<Dietary, string> = {
  // TODO: use translation keys
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-free",
  halal: "Halal",
  kosher: "Kosher",
}

export const DIETARY_COLORS: Record<Dietary | "empty", string> = {
  vegetarian: "bg-green-100 text-green-800",
  vegan: "bg-emerald-100 text-emerald-800",
  "gluten-free": "bg-yellow-100 text-yellow-800",
  halal: "bg-blue-100 text-blue-800",
  kosher: "bg-purple-100 text-purple-800",
  empty: "bg-muted text-muted-foreground",
}
