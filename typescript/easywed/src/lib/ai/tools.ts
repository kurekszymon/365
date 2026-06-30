import { jsonSchema, tool } from "ai"
import type {
  FixtureShape,
  Size,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import {
  DEFAULT_FIXTURE,
  DEFAULT_TABLE,
  getEffectiveSize,
  usePlannerStore,
} from "@/stores/planner.store"
import { getSizeForShape } from "@/components/planner/PropertyPanel/fields/utils"
import { clampToHall } from "@/components/planner/Canvas/utils"
import { useAiChatStore } from "@/stores/aiChat.store"

const normalizeRotation = (rotation: number | undefined): TableRotation =>
  rotation === 90 ? 90 : 0

// Round tables / circle fixtures are squares and can't be rotated (the add forms
// force rotation 0), so collapse height to width and zero the rotation.
const tableSize = (shape: TableShape, width: number, height: number): Size =>
  getSizeForShape(shape, width, height)

const fixtureSize = (
  shape: FixtureShape,
  width: number,
  height: number
): Size => (shape === "circle" ? { width, height: width } : { width, height })

const clampPosition = (
  x: number,
  y: number,
  size: Size,
  rotation: TableRotation
) => {
  const { width, height } = usePlannerStore.getState().hall.dimensions
  return clampToHall({ x, y }, getEffectiveSize(size, rotation), width, height)
}

const fmt = (n: number) => n.toFixed(1)

// Every tool returns this discriminated union so the UI can branch on `status`
// (a machine flag) instead of sniffing the prose. `message` is the
// model/human-readable text fed back into the conversation either way.
export type ToolResult =
  | { status: "ok"; message: string }
  | { status: "cancelled"; message: string }
  | { status: "not_found"; message: string }

const ok = (message: string): ToolResult => ({ status: "ok", message })
const notFound = (message: string): ToolResult => ({
  status: "not_found",
  message,
})

interface AddTableInput {
  name?: string
  shape?: TableShape
  capacity?: number
  width?: number
  height?: number
  rotation?: number
  x?: number
  y?: number
}

interface MoveInput {
  id: string
  x: number
  y: number
}

interface UpdateTableInput {
  id: string
  name?: string
  shape?: TableShape
  capacity?: number
  width?: number
  height?: number
  rotation?: number
}

interface AddFixtureInput {
  name?: string
  shape?: FixtureShape
  width?: number
  height?: number
  rotation?: number
  x?: number
  y?: number
}

interface UpdateFixtureInput {
  id: string
  name?: string
  shape?: FixtureShape
  width?: number
  height?: number
  rotation?: number
}

interface IdInput {
  id: string
}

const positionProps = {
  x: {
    type: "number",
    description: "Left edge in meters from the hall's left.",
  },
  y: { type: "number", description: "Top edge in meters from the hall's top." },
} as const

export const tools = {
  add_table: tool({
    description:
      "Add a new table to the hall. Returns the new table's id. Position is the top-left corner in meters.",
    inputSchema: jsonSchema<AddTableInput>({
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Display name, e.g. 'Head Table'.",
        },
        shape: { type: "string", enum: ["round", "rectangular", "custom"] },
        capacity: { type: "number", description: "Number of seats." },
        width: {
          type: "number",
          description: "Width (or diameter for round) in meters.",
        },
        height: {
          type: "number",
          description: "Height in meters (ignored for round).",
        },
        rotation: { type: "number", enum: [0, 90] },
        ...positionProps,
      },
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const shape = input.shape ?? DEFAULT_TABLE.shape
      const rotation = shape === "round" ? 0 : normalizeRotation(input.rotation)
      const size = tableSize(
        shape,
        input.width ?? DEFAULT_TABLE.size.width,
        input.height ?? DEFAULT_TABLE.size.height
      )
      const pos = clampPosition(input.x ?? 0, input.y ?? 0, size, rotation)
      const id = planner.addTable(
        {
          name: input.name ?? "",
          shape,
          capacity: input.capacity ?? DEFAULT_TABLE.capacity,
          size,
          rotation,
        },
        [],
        pos
      )
      return ok(
        `Added ${shape} table "${input.name ?? ""}" (id ${id}) at (${fmt(pos.x)}, ${fmt(pos.y)}).`
      )
    },
  }),

  move_table: tool({
    description: "Move an existing table to a new top-left position in meters.",
    inputSchema: jsonSchema<MoveInput>({
      type: "object",
      properties: { id: { type: "string" }, ...positionProps },
      required: ["id", "x", "y"],
    }),
    execute: ({ id, x, y }) => {
      const planner = usePlannerStore.getState()
      const table = planner.tables.find((t) => t.id === id)
      if (!table) return notFound(`No table found with id ${id}.`)
      const pos = clampPosition(x, y, table.size, table.rotation)
      planner.updateTablePosition(id, pos.x, pos.y)
      return ok(`Moved table ${id} to (${fmt(pos.x)}, ${fmt(pos.y)}).`)
    },
  }),

  update_table: tool({
    description:
      "Update an existing table's name, shape, capacity, size, or rotation. Only provided fields change.",
    inputSchema: jsonSchema<UpdateTableInput>({
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        shape: { type: "string", enum: ["round", "rectangular", "custom"] },
        capacity: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        rotation: { type: "number", enum: [0, 90] },
      },
      required: ["id"],
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const table = planner.tables.find((t) => t.id === input.id)
      if (!table) return notFound(`No table found with id ${input.id}.`)
      // Hard guard: the DB capacity trigger would reject a shrink below the
      // seated count, but mutations only console.error, so the optimistic store
      // would silently diverge. Refuse it here instead.
      if (input.capacity != null) {
        const assigned = planner.guests.filter(
          (g) => g.tableId === input.id
        ).length
        if (input.capacity < assigned)
          return {
            status: "cancelled",
            message: `Can't set capacity to ${input.capacity}: ${assigned} guest(s) are seated at table ${input.id}. Unassign some first.`,
          }
      }
      const shape = input.shape ?? table.shape
      const rotation =
        shape === "round"
          ? 0
          : normalizeRotation(input.rotation ?? table.rotation)
      const size = tableSize(
        shape,
        input.width ?? table.size.width,
        input.height ?? table.size.height
      )
      planner.updateTable(input.id, {
        name: input.name ?? table.name,
        shape,
        capacity: input.capacity ?? table.capacity,
        size,
        rotation,
        geometry: table.geometry,
        seats: table.seats,
      })
      planner.saveTable(input.id)
      return ok(`Updated table ${input.id}.`)
    },
  }),

  delete_table: tool({
    description:
      "Delete a table. Asks the user to confirm before deleting (there is no undo).",
    inputSchema: jsonSchema<IdInput>({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
    execute: async ({ id }): Promise<ToolResult> => {
      const planner = usePlannerStore.getState()
      const table = planner.tables.find((t) => t.id === id)
      if (!table) return notFound(`No table found with id ${id}.`)
      const approved = await useAiChatStore
        .getState()
        .requestConfirm("delete_table", table.name || `table ${id}`)
      if (!approved)
        return {
          status: "cancelled",
          message: `Deletion of table ${id} was cancelled by the user.`,
        }
      planner.deleteTable(id)
      return ok(`Deleted table ${id}.`)
    },
  }),

  add_fixture: tool({
    description:
      "Add a non-seating fixture (stage, dance floor, bar, etc.). Returns the new fixture's id. Position is the top-left corner in meters.",
    inputSchema: jsonSchema<AddFixtureInput>({
      type: "object",
      properties: {
        name: { type: "string", description: "Display name, e.g. 'Stage'." },
        shape: {
          type: "string",
          enum: ["rectangle", "circle", "rounded", "polygon"],
        },
        width: {
          type: "number",
          description: "Width (or diameter for circle) in meters.",
        },
        height: {
          type: "number",
          description: "Height in meters (ignored for circle).",
        },
        rotation: { type: "number", enum: [0, 90] },
        ...positionProps,
      },
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const shape = input.shape ?? DEFAULT_FIXTURE.shape
      const rotation =
        shape === "circle" ? 0 : normalizeRotation(input.rotation)
      const size = fixtureSize(
        shape,
        input.width ?? DEFAULT_FIXTURE.size.width,
        input.height ?? DEFAULT_FIXTURE.size.height
      )
      const pos = clampPosition(input.x ?? 0, input.y ?? 0, size, rotation)
      const id = planner.addFixture(
        { name: input.name ?? "", shape, size, rotation },
        pos
      )
      return ok(
        `Added ${shape} fixture "${input.name ?? ""}" (id ${id}) at (${fmt(pos.x)}, ${fmt(pos.y)}).`
      )
    },
  }),

  move_fixture: tool({
    description:
      "Move an existing fixture to a new top-left position in meters.",
    inputSchema: jsonSchema<MoveInput>({
      type: "object",
      properties: { id: { type: "string" }, ...positionProps },
      required: ["id", "x", "y"],
    }),
    execute: ({ id, x, y }) => {
      const planner = usePlannerStore.getState()
      const fixture = planner.fixtures.find((f) => f.id === id)
      if (!fixture) return notFound(`No fixture found with id ${id}.`)
      const pos = clampPosition(x, y, fixture.size, fixture.rotation)
      planner.updateFixturePosition(id, pos.x, pos.y)
      return ok(`Moved fixture ${id} to (${fmt(pos.x)}, ${fmt(pos.y)}).`)
    },
  }),

  update_fixture: tool({
    description:
      "Update an existing fixture's name, shape, size, or rotation. Only provided fields change.",
    inputSchema: jsonSchema<UpdateFixtureInput>({
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        shape: {
          type: "string",
          enum: ["rectangle", "circle", "rounded", "polygon"],
        },
        width: { type: "number" },
        height: { type: "number" },
        rotation: { type: "number", enum: [0, 90] },
      },
      required: ["id"],
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const fixture = planner.fixtures.find((f) => f.id === input.id)
      if (!fixture) return notFound(`No fixture found with id ${input.id}.`)
      const shape = input.shape ?? fixture.shape
      const rotation =
        shape === "circle"
          ? 0
          : normalizeRotation(input.rotation ?? fixture.rotation)
      const size = fixtureSize(
        shape,
        input.width ?? fixture.size.width,
        input.height ?? fixture.size.height
      )
      planner.updateFixture(input.id, {
        name: input.name ?? fixture.name,
        shape,
        size,
        rotation,
        geometry: fixture.geometry,
      })
      planner.saveFixture(input.id)
      return ok(`Updated fixture ${input.id}.`)
    },
  }),

  delete_fixture: tool({
    description:
      "Delete a fixture. Asks the user to confirm before deleting (there is no undo).",
    inputSchema: jsonSchema<IdInput>({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
    execute: async ({ id }): Promise<ToolResult> => {
      const planner = usePlannerStore.getState()
      const fixture = planner.fixtures.find((f) => f.id === id)
      if (!fixture) return notFound(`No fixture found with id ${id}.`)
      const approved = await useAiChatStore
        .getState()
        .requestConfirm("delete_fixture", fixture.name || `fixture ${id}`)
      if (!approved)
        return {
          status: "cancelled",
          message: `Deletion of fixture ${id} was cancelled by the user.`,
        }
      planner.deleteFixture(id)
      return ok(`Deleted fixture ${id}.`)
    },
  }),
}
