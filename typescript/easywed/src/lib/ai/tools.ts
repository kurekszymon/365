import { jsonSchema, tool } from "ai"
import type {
  FixtureShape,
  Hall,
  Size,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import {
  DEFAULT_FIXTURE,
  DEFAULT_HALL,
  DEFAULT_TABLE,
  getEffectiveSize,
  usePlannerStore,
} from "@/stores/planner.store"
import { getSizeForShape } from "@/components/planner/EntityForms/fields/utils"
import { clampToHall } from "@/components/planner/Canvas/utils"
import { useAiChatStore } from "@/stores/aiChat.store"
import i18n from "@/i18n"

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

// The hall a tool call targets: an explicit hallId, else the first hall (the
// documented default). Undefined only when the wedding has no halls at all.
const resolveHall = (hallId: string | undefined): Hall | undefined => {
  const { halls } = usePlannerStore.getState()
  return (hallId ? halls.find((h) => h.id === hallId) : undefined) ?? halls[0]
}

const clampPosition = (
  hall: Hall,
  x: number,
  y: number,
  size: Size,
  rotation: TableRotation
) =>
  clampToHall(
    { x, y },
    getEffectiveSize(size, rotation),
    hall.size.width,
    hall.size.height
  )

const fmt = (n: number) => n.toFixed(1)

// User-facing label for a tool result. Ids are internal-only (the chip subtitle
// shows these strings verbatim to the user), so we refer to objects by name,
// falling back to a localized "the <shape> table/fixture" when unnamed. The
// shape picks the variant via i18next `context` (…label.table_round, etc.).
const tableLabel = (t: { name: string; shape: TableShape }) =>
  t.name.trim()
    ? i18n.t("assistant.tool.label.named", { name: t.name.trim() })
    : i18n.t("assistant.tool.label.table", { context: t.shape })
const fixtureLabel = (f: { name: string; shape: FixtureShape }) =>
  f.name.trim()
    ? i18n.t("assistant.tool.label.named", { name: f.name.trim() })
    : i18n.t("assistant.tool.label.fixture", { context: f.shape })

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
  hallId?: string
}

interface MoveInput {
  id: string
  x: number
  y: number
  hallId?: string
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
  hallId?: string
}

interface AddHallInput {
  name?: string
  floor?: number
  width?: number
  height?: number
}

interface UpdateHallInput {
  id: string
  name?: string
  floor?: number | null
  width?: number
  height?: number
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

const hallIdProp = {
  hallId: {
    type: "string",
    description:
      "Target hall id (from the snapshot). Defaults to the first hall.",
  },
} as const

const hallLabel = (h: { name: string }, index: number) =>
  h.name.trim() || i18n.t("hall.unnamed_index", { index: index + 1 })

const noHall = (): ToolResult => ({
  status: "cancelled",
  message: i18n.t("assistant.tool.result.no_hall"),
})

export const tools = {
  add_table: tool({
    description:
      "Add a new table to the hall. Position is the top-left corner in meters.",
    inputSchema: jsonSchema<AddTableInput>({
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Display name, e.g. 'Head Table'.",
        },
        shape: { type: "string", enum: ["round", "rectangular"] },
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
        ...hallIdProp,
      },
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const hall = resolveHall(input.hallId)
      if (!hall) return noHall()
      const shape = input.shape ?? DEFAULT_TABLE.shape
      const rotation = shape === "round" ? 0 : normalizeRotation(input.rotation)
      const size = tableSize(
        shape,
        input.width ?? DEFAULT_TABLE.size.width,
        input.height ?? DEFAULT_TABLE.size.height
      )
      const pos = clampPosition(
        hall,
        input.x ?? 0,
        input.y ?? 0,
        size,
        rotation
      )
      planner.addTable(
        {
          name: input.name?.trim() ?? "",
          shape,
          capacity: input.capacity ?? DEFAULT_TABLE.capacity,
          size,
          rotation,
          hallId: hall.id,
        },
        [],
        pos
      )
      return ok(
        i18n.t("assistant.tool.result.table_added", {
          label: tableLabel({ name: input.name ?? "", shape }),
          x: fmt(pos.x),
          y: fmt(pos.y),
        })
      )
    },
  }),

  move_table: tool({
    description:
      "Move an existing table to a new top-left position in meters. Pass hallId to transfer it to another hall (position is then relative to that hall).",
    inputSchema: jsonSchema<MoveInput>({
      type: "object",
      properties: { id: { type: "string" }, ...positionProps, ...hallIdProp },
      required: ["id", "x", "y"],
    }),
    execute: ({ id, x, y, hallId }) => {
      const planner = usePlannerStore.getState()
      const table = planner.tables.find((t) => t.id === id)
      if (!table) return notFound(i18n.t("assistant.tool.result.table_missing"))
      const hall = resolveHall(hallId ?? table.hallId)
      if (!hall) return noHall()
      const pos = clampPosition(hall, x, y, table.size, table.rotation)
      planner.updateTablePosition(
        id,
        pos.x,
        pos.y,
        hall.id !== table.hallId ? hall.id : undefined
      )
      return ok(
        i18n.t("assistant.tool.result.table_moved", {
          label: tableLabel(table),
          x: fmt(pos.x),
          y: fmt(pos.y),
        })
      )
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
        shape: { type: "string", enum: ["round", "rectangular"] },
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
      if (!table) return notFound(i18n.t("assistant.tool.result.table_missing"))
      const assignedIds = planner.guests
        .filter((g) => g.tableId === input.id)
        .map((g) => g.id)
      // Hard guard: the DB capacity trigger would reject a shrink below the
      // seated count, but mutations only console.error, so the optimistic store
      // would silently diverge. Refuse it here instead.
      if (input.capacity != null && input.capacity < assignedIds.length)
        return {
          status: "cancelled",
          message: i18n.t("assistant.tool.result.capacity_too_small", {
            count: assignedIds.length,
            capacity: input.capacity,
            label: tableLabel(table),
          }),
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
      const hall = resolveHall(table.hallId)
      if (!hall) return noHall()
      // Pass the current occupants as the authoritative guest list. updateTable
      // treats a missing list as "no guests" and would unassign everyone seated
      // here (TablePanelContent passes assignedGuestIds for the same reason).
      planner.updateTable(
        input.id,
        {
          name: input.name?.trim() ?? table.name,
          shape,
          capacity: input.capacity ?? table.capacity,
          size,
          rotation,
          hallId: table.hallId,
          geometry: table.geometry,
          seats: table.seats,
        },
        assignedIds
      )
      // updateTable keeps the existing position untouched, but a size/rotation
      // change can push it outside the hall bounds (especially near an edge) -
      // re-clamp and persist the corrected position if it moved.
      const pos = clampPosition(
        hall,
        table.position.x,
        table.position.y,
        size,
        rotation
      )
      if (pos.x !== table.position.x || pos.y !== table.position.y)
        planner.updateTablePosition(input.id, pos.x, pos.y)
      planner.saveTable(input.id)
      return ok(
        i18n.t("assistant.tool.result.table_updated", {
          label: tableLabel({ name: input.name ?? table.name, shape }),
        })
      )
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
      if (!table) return notFound(i18n.t("assistant.tool.result.table_missing"))
      const approved = await useAiChatStore
        .getState()
        .requestConfirm(
          "delete_table",
          table.name.trim() ||
            i18n.t("assistant.tool.label.table", { context: table.shape })
        )
      if (!approved)
        return {
          status: "cancelled",
          message: i18n.t("assistant.tool.result.table_delete_cancelled", {
            label: tableLabel(table),
          }),
        }
      planner.deleteTable(id)
      return ok(
        i18n.t("assistant.tool.result.table_deleted", {
          label: tableLabel(table),
        })
      )
    },
  }),

  add_fixture: tool({
    description:
      "Add a non-seating fixture (stage, dance floor, bar, etc.). Position is the top-left corner in meters.",
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
        ...hallIdProp,
      },
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const hall = resolveHall(input.hallId)
      if (!hall) return noHall()
      const shape = input.shape ?? DEFAULT_FIXTURE.shape
      const rotation =
        shape === "circle" ? 0 : normalizeRotation(input.rotation)
      const size = fixtureSize(
        shape,
        input.width ?? DEFAULT_FIXTURE.size.width,
        input.height ?? DEFAULT_FIXTURE.size.height
      )
      const pos = clampPosition(
        hall,
        input.x ?? 0,
        input.y ?? 0,
        size,
        rotation
      )
      planner.addFixture(
        {
          name: input.name?.trim() ?? "",
          shape,
          size,
          rotation,
          hallId: hall.id,
        },
        pos
      )
      return ok(
        i18n.t("assistant.tool.result.fixture_added", {
          label: fixtureLabel({ name: input.name ?? "", shape }),
          x: fmt(pos.x),
          y: fmt(pos.y),
        })
      )
    },
  }),

  move_fixture: tool({
    description:
      "Move an existing fixture to a new top-left position in meters. Pass hallId to transfer it to another hall (position is then relative to that hall).",
    inputSchema: jsonSchema<MoveInput>({
      type: "object",
      properties: { id: { type: "string" }, ...positionProps, ...hallIdProp },
      required: ["id", "x", "y"],
    }),
    execute: ({ id, x, y, hallId }) => {
      const planner = usePlannerStore.getState()
      const fixture = planner.fixtures.find((f) => f.id === id)
      if (!fixture)
        return notFound(i18n.t("assistant.tool.result.fixture_missing"))
      const hall = resolveHall(hallId ?? fixture.hallId)
      if (!hall) return noHall()
      const pos = clampPosition(hall, x, y, fixture.size, fixture.rotation)
      planner.updateFixturePosition(
        id,
        pos.x,
        pos.y,
        hall.id !== fixture.hallId ? hall.id : undefined
      )
      return ok(
        i18n.t("assistant.tool.result.fixture_moved", {
          label: fixtureLabel(fixture),
          x: fmt(pos.x),
          y: fmt(pos.y),
        })
      )
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
      if (!fixture)
        return notFound(i18n.t("assistant.tool.result.fixture_missing"))
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
      const hall = resolveHall(fixture.hallId)
      if (!hall) return noHall()
      planner.updateFixture(input.id, {
        name: input.name?.trim() ?? fixture.name,
        shape,
        size,
        rotation,
        hallId: fixture.hallId,
        geometry: fixture.geometry,
      })
      // updateFixture keeps the existing position untouched, but a size/rotation
      // change can push it outside the hall bounds (especially near an edge) -
      // re-clamp and persist the corrected position if it moved.
      const pos = clampPosition(
        hall,
        fixture.position.x,
        fixture.position.y,
        size,
        rotation
      )
      if (pos.x !== fixture.position.x || pos.y !== fixture.position.y)
        planner.updateFixturePosition(input.id, pos.x, pos.y)
      planner.saveFixture(input.id)
      return ok(
        i18n.t("assistant.tool.result.fixture_updated", {
          label: fixtureLabel({ name: input.name ?? fixture.name, shape }),
        })
      )
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
      if (!fixture)
        return notFound(i18n.t("assistant.tool.result.fixture_missing"))
      const approved = await useAiChatStore
        .getState()
        .requestConfirm(
          "delete_fixture",
          fixture.name.trim() ||
            i18n.t("assistant.tool.label.fixture", { context: fixture.shape })
        )
      if (!approved)
        return {
          status: "cancelled",
          message: i18n.t("assistant.tool.result.fixture_delete_cancelled", {
            label: fixtureLabel(fixture),
          }),
        }
      planner.deleteFixture(id)
      return ok(
        i18n.t("assistant.tool.result.fixture_deleted", {
          label: fixtureLabel(fixture),
        })
      )
    },
  }),

  add_hall: tool({
    description:
      "Add a new hall (room / floor area). It is placed automatically next to the existing halls; the user can drag it into place.",
    inputSchema: jsonSchema<AddHallInput>({
      type: "object",
      properties: {
        name: { type: "string", description: "Display name, e.g. 'Sala B'." },
        floor: {
          type: "number",
          description: "Optional floor number (0, 1, 2…).",
        },
        width: { type: "number", description: "Width in meters." },
        height: { type: "number", description: "Height in meters." },
      },
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const name = input.name?.trim() ?? ""
      planner.addHall({
        name,
        floor: input.floor ?? null,
        preset: "rectangle",
        size: {
          width: input.width ?? DEFAULT_HALL.size.width,
          height: input.height ?? DEFAULT_HALL.size.height,
        },
      })
      return ok(
        i18n.t("assistant.tool.result.hall_added", {
          label: hallLabel({ name }, planner.halls.length),
        })
      )
    },
  }),

  update_hall: tool({
    description:
      "Update a hall's name, floor, or size. Only provided fields change. Pass floor: null to clear the floor.",
    inputSchema: jsonSchema<UpdateHallInput>({
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        floor: { type: ["number", "null"] },
        width: { type: "number" },
        height: { type: "number" },
      },
      required: ["id"],
    }),
    execute: (input) => {
      const planner = usePlannerStore.getState()
      const index = planner.halls.findIndex((h) => h.id === input.id)
      const hall = planner.halls.at(index)
      if (index < 0 || !hall)
        return notFound(i18n.t("assistant.tool.result.hall_missing"))
      planner.updateHall(input.id, {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.floor !== undefined ? { floor: input.floor } : {}),
        ...(input.width != null || input.height != null
          ? {
              size: {
                width: input.width ?? hall.size.width,
                height: input.height ?? hall.size.height,
              },
            }
          : {}),
      })
      planner.saveHall(input.id)
      return ok(
        i18n.t("assistant.tool.result.hall_updated", {
          label: hallLabel({ name: input.name ?? hall.name }, index),
        })
      )
    },
  }),

  delete_hall: tool({
    description:
      "Delete an EMPTY hall. Refuses when the hall still contains tables or fixtures - move or delete them first (the user can also do this from the hall's settings). Asks the user to confirm.",
    inputSchema: jsonSchema<IdInput>({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
    execute: async ({ id }): Promise<ToolResult> => {
      const planner = usePlannerStore.getState()
      const index = planner.halls.findIndex((h) => h.id === id)
      const hall = planner.halls.at(index)
      if (index < 0 || !hall)
        return notFound(i18n.t("assistant.tool.result.hall_missing"))
      const label = hallLabel(hall, index)
      const contentCount =
        planner.tables.filter((t) => t.hallId === id).length +
        planner.fixtures.filter((f) => f.hallId === id).length
      if (contentCount > 0)
        return {
          status: "cancelled",
          message: i18n.t("assistant.tool.result.hall_not_empty", {
            label,
            count: contentCount,
          }),
        }
      const approved = await useAiChatStore
        .getState()
        .requestConfirm("delete_hall", label)
      if (!approved)
        return {
          status: "cancelled",
          message: i18n.t("assistant.tool.result.hall_delete_cancelled", {
            label,
          }),
        }
      planner.deleteHall(id, { kind: "delete" })
      return ok(i18n.t("assistant.tool.result.hall_deleted", { label }))
    },
  }),
}
