// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { migrateLocalWedding } from "./migrateLocalWedding"
import type { MigrationWrites } from "./migrateLocalWedding"
import type { LocalPlannerSnapshot } from "@/lib/localWedding"
import type { Reminder } from "@/stores/reminders.store"
import {
  GLOBAL_STORAGE_KEY,
  LOCAL_WEDDING_ID,
  PLANNER_STORAGE_KEY,
  REMINDERS_STORAGE_KEY,
} from "@/lib/localWedding"
import { useGlobalStore } from "@/stores/global.store"

const OWNER = "11111111-1111-1111-1111-111111111111"
const NEW_WEDDING = "22222222-2222-2222-2222-222222222222"
const HALL = "33333333-3333-3333-3333-333333333333"

const hall = {
  id: HALL,
  name: "Sala",
  preset: "rectangle" as const,
  size: { width: 20, height: 12 },
  position: { x: 0, y: 0 },
}

const planner = (): LocalPlannerSnapshot => ({
  halls: [hall],
  tables: [
    {
      id: "t1",
      name: "Stół 1",
      shape: "round",
      capacity: 8,
      size: { width: 1.6, height: 1.6 },
      rotation: 0,
      position: { x: 1, y: 1 },
      hallId: HALL,
    },
  ],
  guests: [
    { id: "g1", name: "Anna", dietary: [], tableId: "t1", seatId: null },
  ],
  fixtures: [],
})

const reminders = (): Array<Reminder> => [
  {
    uuid: "r1",
    text: "Zamówić tort",
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
]

// Guest-mode state as it actually sits on disk when the dialog opens: three
// persisted keys, and the local sentinel as the active wedding.
const seedLocalWedding = () => {
  localStorage.setItem(
    PLANNER_STORAGE_KEY,
    JSON.stringify({ state: planner() })
  )
  localStorage.setItem(
    GLOBAL_STORAGE_KEY,
    JSON.stringify({ state: { name: "Nasze wesele" } })
  )
  localStorage.setItem(
    REMINDERS_STORAGE_KEY,
    JSON.stringify({ state: { reminders: reminders() } })
  )
  useGlobalStore.setState({
    weddingId: LOCAL_WEDDING_ID,
    name: "Nasze wesele",
    role: "owner",
    members: [],
  })
}

const localStorageIntact = () =>
  localStorage.getItem(PLANNER_STORAGE_KEY) !== null &&
  localStorage.getItem(GLOBAL_STORAGE_KEY) !== null &&
  localStorage.getItem(REMINDERS_STORAGE_KEY) !== null

interface Recorder {
  writes: MigrationWrites
  calls: Array<string>
  activeWeddingIdDuringWrites: Array<string | undefined>
}

// Records the call order and, for each write, which wedding was active at the
// time - the writes scope themselves with getWeddingId(), so "was the new
// wedding live when guests were inserted" is part of what's under test.
const recorder = (
  overrides: Partial<Record<string, boolean>> = {}
): Recorder => {
  const calls: Array<string> = []
  const activeWeddingIdDuringWrites: Array<string | undefined> = []

  const track = (name: string, result: boolean) => {
    calls.push(name)
    activeWeddingIdDuringWrites.push(useGlobalStore.getState().weddingId)
    return Promise.resolve(overrides[name] ?? result)
  }

  return {
    calls,
    activeWeddingIdDuringWrites,
    writes: {
      createWedding: () => {
        calls.push("createWedding")
        return Promise.resolve(
          overrides.createWedding === false ? null : NEW_WEDDING
        )
      },
      writeLayout: () => track("writeLayout", true),
      writeGuests: () => track("writeGuests", true),
      writeReminders: () => track("writeReminders", true),
      discardWedding: () => track("discardWedding", true),
    },
  }
}

const input = () => ({
  ownerId: OWNER,
  planner: planner(),
  global: { name: "Nasze wesele" },
  reminders: reminders(),
  fallbackName: "Wesele",
})

afterEach(() => {
  localStorage.clear()
  useGlobalStore.setState({
    weddingId: undefined,
    name: undefined,
    date: undefined,
    role: undefined,
    members: [],
  })
})

describe("migrateLocalWedding", () => {
  it("clears local storage only after every write has landed", async () => {
    seedLocalWedding()
    const rec = recorder()

    const result = await migrateLocalWedding(input(), rec.writes)

    expect(result).toEqual({ ok: true, weddingId: NEW_WEDDING })
    expect(rec.calls).toEqual([
      "createWedding",
      "writeLayout",
      "writeGuests",
      "writeReminders",
    ])
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(GLOBAL_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(REMINDERS_STORAGE_KEY)).toBeNull()
    // The dialog navigates to the new wedding, so it stays active.
    expect(useGlobalStore.getState().weddingId).toBe(NEW_WEDDING)
  })

  it("makes the new wedding active before any scoped write runs", async () => {
    seedLocalWedding()
    const rec = recorder()

    await migrateLocalWedding(input(), rec.writes)

    // Every recorded write saw the new wedding, not the local sentinel - a
    // write that ran while "local" was active would silently no-op through
    // run()'s local gate and report success.
    expect(rec.activeWeddingIdDuringWrites).toEqual([
      NEW_WEDDING,
      NEW_WEDDING,
      NEW_WEDDING,
    ])
  })

  // The regression this stage exists for: the guest list is the only thing the
  // local snapshot uniquely holds once the layout is up, and it used to be
  // dropped on exactly this path.
  it("rolls back and keeps local storage when the guest write fails", async () => {
    seedLocalWedding()
    const rec = recorder({ writeGuests: false })

    const result = await migrateLocalWedding(input(), rec.writes)

    expect(result).toEqual({ ok: false })
    expect(rec.calls).toContain("discardWedding")
    expect(localStorageIntact()).toBe(true)
  })

  it("rolls back and keeps local storage when the reminder write fails", async () => {
    seedLocalWedding()
    const rec = recorder({ writeReminders: false })

    const result = await migrateLocalWedding(input(), rec.writes)

    expect(result).toEqual({ ok: false })
    expect(rec.calls).toContain("discardWedding")
    expect(localStorageIntact()).toBe(true)
  })

  it("rolls back without attempting guests or reminders when the layout fails", async () => {
    seedLocalWedding()
    const rec = recorder({ writeLayout: false })

    const result = await migrateLocalWedding(input(), rec.writes)

    expect(result).toEqual({ ok: false })
    expect(rec.calls).toEqual([
      "createWedding",
      "writeLayout",
      "discardWedding",
    ])
    expect(localStorageIntact()).toBe(true)
  })

  it("restores the whole previous global slice on rollback", async () => {
    seedLocalWedding()
    // discardWedding is the real deleteWedding in production, which clears
    // name/role/members via forgetIfCurrent - simulate that here so the restore
    // is actually exercised rather than trivially passing.
    const rec = recorder({ writeGuests: false })
    const discard = rec.writes.discardWedding
    rec.writes.discardWedding = (weddingId) => {
      useGlobalStore.setState({
        weddingId: undefined,
        name: undefined,
        role: undefined,
        members: [],
      })
      return discard(weddingId)
    }

    await migrateLocalWedding(input(), rec.writes)

    const state = useGlobalStore.getState()
    expect(state.weddingId).toBe(LOCAL_WEDDING_ID)
    expect(state.name).toBe("Nasze wesele")
    expect(state.role).toBe("owner")
  })

  it("reports failure without a rollback when the wedding is never created", async () => {
    seedLocalWedding()
    const rec = recorder({ createWedding: false })

    const result = await migrateLocalWedding(input(), rec.writes)

    expect(result).toEqual({ ok: false })
    expect(rec.calls).toEqual(["createWedding"])
    expect(localStorageIntact()).toBe(true)
    expect(useGlobalStore.getState().weddingId).toBe(LOCAL_WEDDING_ID)
  })

  it("treats a write that throws as a failure rather than rejecting", async () => {
    seedLocalWedding()
    const rec = recorder()
    // Malformed persisted rows make the row mappers throw synchronously, before
    // any request goes out - that has to reach the rollback like any other
    // failure, not escape as an unhandled rejection.
    rec.writes.writeGuests = () => {
      throw new TypeError("Cannot read properties of undefined (reading 'x')")
    }

    const result = await migrateLocalWedding(input(), rec.writes)

    expect(result).toEqual({ ok: false })
    expect(rec.calls).toContain("discardWedding")
    expect(localStorageIntact()).toBe(true)
  })

  it("keeps local storage when the rollback itself fails", async () => {
    seedLocalWedding()
    const rec = recorder({ writeGuests: false, discardWedding: false })

    const result = await migrateLocalWedding(input(), rec.writes)

    // An orphan wedding survives, but the local copy - the only one that still
    // has the guests - must not be the thing we drop.
    expect(result).toEqual({ ok: false })
    expect(localStorageIntact()).toBe(true)
  })

  it("skips the layout write for a hall-less snapshot but still migrates guests", async () => {
    seedLocalWedding()
    const rec = recorder()

    const result = await migrateLocalWedding(
      {
        ...input(),
        planner: {
          halls: [],
          tables: [],
          fixtures: [],
          guests: planner().guests,
        },
      },
      rec.writes
    )

    expect(result).toEqual({ ok: true, weddingId: NEW_WEDDING })
    expect(rec.calls).toEqual([
      "createWedding",
      "writeGuests",
      "writeReminders",
    ])
  })

  it("falls back to the supplied name and a null date for an empty snapshot", async () => {
    seedLocalWedding()
    const rec = recorder()
    let created: { name: string; date: string | null } | null = null
    rec.writes.createWedding = ({ name, date }) => {
      created = { name, date }
      return Promise.resolve(NEW_WEDDING)
    }

    await migrateLocalWedding(
      { ...input(), global: { name: "   " } },
      rec.writes
    )

    expect(created).toEqual({ name: "Wesele", date: null })
  })

  it("passes a valid date through as a date column and drops an invalid one", async () => {
    seedLocalWedding()
    const dates: Array<string | null> = []
    const rec = recorder()
    rec.writes.createWedding = ({ date }) => {
      dates.push(date)
      return Promise.resolve(NEW_WEDDING)
    }

    await migrateLocalWedding(
      { ...input(), global: { date: new Date("2026-06-13T10:00:00Z") } },
      rec.writes
    )
    await migrateLocalWedding(
      { ...input(), global: { date: new Date("nonsense") } },
      rec.writes
    )

    expect(dates).toEqual(["2026-06-13", null])
  })
})
