// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  GLOBAL_STORAGE_KEY,
  LOCAL_WEDDING_ID,
  PLANNER_STORAGE_KEY,
  REMINDERS_STORAGE_KEY,
  clearLocalWeddingStorage,
  createLocalGatedStorage,
  hasLocalWeddingData,
  isLocalWedding,
  normalizeLocalRemindersSnapshot,
  readLocalGlobalSnapshot,
  readLocalPlannerSnapshot,
  readLocalRemindersSnapshot,
  registerActiveWeddingIdGetter,
} from "./localWedding"

beforeEach(() => {
  localStorage.clear()
})

// Writes a reminders payload in zustand's persisted envelope shape. Rows are
// `unknown` on purpose: several tests persist deliberately malformed ones.
const persistReminders = (reminders: Array<unknown>) =>
  localStorage.setItem(
    REMINDERS_STORAGE_KEY,
    JSON.stringify({ state: { reminders }, version: 0 })
  )

const isValidDate = (value: unknown) =>
  value instanceof Date && !Number.isNaN(value.getTime())

// registerActiveWeddingIdGetter mutates module-level state in localWedding.ts
// (not per-test state), so a getter registered by one test would otherwise
// leak into every test that runs after it in this worker.
afterEach(() => {
  registerActiveWeddingIdGetter(() => undefined)
})

describe("isLocalWedding", () => {
  it("is true only for the local sentinel", () => {
    expect(isLocalWedding(LOCAL_WEDDING_ID)).toBe(true)
    expect(isLocalWedding("some-cloud-uuid")).toBe(false)
    expect(isLocalWedding(undefined)).toBe(false)
  })
})

describe("createLocalGatedStorage", () => {
  it("writes only while the active wedding is local", () => {
    let activeId: string | undefined = LOCAL_WEDDING_ID
    registerActiveWeddingIdGetter(() => activeId)
    const storage = createLocalGatedStorage()

    storage.setItem("k", "v1")
    expect(localStorage.getItem("k")).toBe("v1")

    activeId = "cloud-uuid"
    storage.setItem("k", "v2")
    expect(localStorage.getItem("k")).toBe("v1")

    storage.removeItem("k")
    expect(localStorage.getItem("k")).toBe("v1")

    activeId = LOCAL_WEDDING_ID
    storage.removeItem("k")
    expect(localStorage.getItem("k")).toBeNull()
  })

  it("always reads through regardless of active wedding", () => {
    localStorage.setItem("k", "v1")
    registerActiveWeddingIdGetter(() => "cloud-uuid")
    const storage = createLocalGatedStorage()
    expect(storage.getItem("k")).toBe("v1")
  })
})

describe("readLocalPlannerSnapshot / readLocalGlobalSnapshot", () => {
  it("returns null when nothing is persisted", () => {
    expect(readLocalPlannerSnapshot()).toBeNull()
    expect(readLocalGlobalSnapshot()).toBeNull()
  })

  it("returns null on malformed JSON instead of throwing", () => {
    localStorage.setItem(PLANNER_STORAGE_KEY, "{not json")
    expect(readLocalPlannerSnapshot()).toBeNull()
  })

  it("unwraps zustand's persisted envelope and revives global.date", () => {
    localStorage.setItem(
      PLANNER_STORAGE_KEY,
      JSON.stringify({
        state: {
          tables: [{ id: "t1" }],
          guests: [],
          fixtures: [],
          hall: { dimensions: { width: 20, height: 12 } },
        },
        version: 0,
      })
    )
    localStorage.setItem(
      GLOBAL_STORAGE_KEY,
      JSON.stringify({
        state: { name: "Our Wedding", date: "2026-08-01" },
        version: 0,
      })
    )

    const planner = readLocalPlannerSnapshot()
    expect(planner?.tables).toHaveLength(1)

    const global = readLocalGlobalSnapshot()
    expect(global?.name).toBe("Our Wedding")
    expect(global?.date).toBeInstanceOf(Date)
  })

  it("drops an unparsable global.date instead of returning an Invalid Date", () => {
    localStorage.setItem(
      GLOBAL_STORAGE_KEY,
      JSON.stringify({
        state: { name: "Our Wedding", date: "not-a-date" },
        version: 0,
      })
    )

    const global = readLocalGlobalSnapshot()
    expect(global?.name).toBe("Our Wedding")
    expect(global?.date).toBeUndefined()
  })

  it("returns null when the persisted hall shape is missing or malformed", () => {
    localStorage.setItem(
      PLANNER_STORAGE_KEY,
      JSON.stringify({
        state: { tables: [{ id: "t1" }], guests: [], fixtures: [] },
        version: 0,
      })
    )
    expect(readLocalPlannerSnapshot()).toBeNull()

    localStorage.setItem(
      PLANNER_STORAGE_KEY,
      JSON.stringify({
        state: {
          tables: [],
          guests: [],
          fixtures: [],
          hall: { dimensions: { width: "20", height: 12 } },
        },
        version: 0,
      })
    )
    expect(readLocalPlannerSnapshot()).toBeNull()
  })
})

describe("readLocalRemindersSnapshot", () => {
  it("returns an empty array when nothing is persisted", () => {
    expect(readLocalRemindersSnapshot()).toEqual([])
  })

  it("returns an empty array on malformed JSON instead of throwing", () => {
    localStorage.setItem(REMINDERS_STORAGE_KEY, "{not json")
    expect(readLocalRemindersSnapshot()).toEqual([])
  })

  it("unwraps zustand's persisted envelope and revives the date fields", () => {
    persistReminders([
      {
        uuid: "r1",
        text: "Book the band",
        status: "open",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-02T10:00:00.000Z",
        due: "2026-08-01T00:00:00.000Z",
      },
    ])

    const [reminder] = readLocalRemindersSnapshot()
    expect(reminder.uuid).toBe("r1")
    expect(reminder.text).toBe("Book the band")
    expect(reminder.status).toBe("open")
    expect(reminder.createdAt.toISOString()).toBe("2026-07-01T10:00:00.000Z")
    expect(reminder.updatedAt.toISOString()).toBe("2026-07-02T10:00:00.000Z")
    expect(reminder.due?.toISOString()).toBe("2026-08-01T00:00:00.000Z")
  })

  it("keeps a due-less reminder without stamping an undefined `due` key", () => {
    persistReminders([
      {
        uuid: "r1",
        text: "No deadline",
        status: "completed",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z",
      },
    ])

    const [reminder] = readLocalRemindersSnapshot()
    expect(reminder.status).toBe("completed")
    expect("due" in reminder).toBe(false)
  })

  it("drops rows whose identifying fields are missing or malformed", () => {
    persistReminders([
      { uuid: "keep", text: "Valid", status: "open" },
      null,
      "not an object",
      { text: "No uuid", status: "open" },
      { uuid: 42, text: "Numeric uuid", status: "open" },
      { uuid: "no-text", status: "open" },
      { uuid: "bad-status", text: "Unknown status", status: "archived" },
    ])

    const reminders = readLocalRemindersSnapshot()
    expect(reminders.map((r) => r.uuid)).toEqual(["keep"])
  })

  it("returns an empty array when `reminders` isn't an array", () => {
    localStorage.setItem(
      REMINDERS_STORAGE_KEY,
      JSON.stringify({ state: { reminders: { r1: {} } }, version: 0 })
    )
    expect(readLocalRemindersSnapshot()).toEqual([])
  })

  it("backfills timestamps that are missing or unparsable rather than returning Invalid Dates", () => {
    persistReminders([
      { uuid: "r1", text: "No timestamps", status: "open" },
      {
        uuid: "r2",
        text: "Junk timestamps",
        status: "open",
        createdAt: "not-a-date",
        updatedAt: 12345,
      },
    ])

    const reminders = readLocalRemindersSnapshot()
    expect(reminders).toHaveLength(2)
    for (const reminder of reminders) {
      expect(isValidDate(reminder.createdAt)).toBe(true)
      expect(isValidDate(reminder.updatedAt)).toBe(true)
    }
  })

  it("drops an unparsable `due` instead of returning an Invalid Date", () => {
    persistReminders([
      { uuid: "r1", text: "Bad due", status: "open", due: "not-a-date" },
    ])

    const [reminder] = readLocalRemindersSnapshot()
    expect(reminder.uuid).toBe("r1")
    expect(reminder.due).toBeUndefined()
  })
})

describe("normalizeLocalRemindersSnapshot", () => {
  it("returns an empty array for a null/undefined/non-object payload", () => {
    expect(normalizeLocalRemindersSnapshot(null)).toEqual([])
    expect(normalizeLocalRemindersSnapshot(undefined)).toEqual([])
    expect(normalizeLocalRemindersSnapshot("nonsense")).toEqual([])
    expect(normalizeLocalRemindersSnapshot({})).toEqual([])
  })

  // reminders.store's persist `merge` hands this JSON-parsed state (dates as
  // strings), but the helper also has to survive already-revived `Date`s.
  it("passes through values that are already Date instances", () => {
    const createdAt = new Date("2026-07-01T10:00:00.000Z")
    const reminders = normalizeLocalRemindersSnapshot({
      reminders: [
        {
          uuid: "r1",
          text: "Already revived",
          status: "open",
          createdAt,
          updatedAt: createdAt,
          due: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
    })

    expect(reminders[0].createdAt).toEqual(createdAt)
    expect(reminders[0].due?.toISOString()).toBe("2026-08-01T00:00:00.000Z")
  })

  it("drops an Invalid Date instance the same way it drops a bad string", () => {
    const reminders = normalizeLocalRemindersSnapshot({
      reminders: [
        {
          uuid: "r1",
          text: "Invalid Date instance",
          status: "open",
          createdAt: new Date("nope"),
          due: new Date("nope"),
        },
      ],
    })

    expect(isValidDate(reminders[0].createdAt)).toBe(true)
    expect(reminders[0].due).toBeUndefined()
  })
})

describe("hasLocalWeddingData", () => {
  it("is false when storage is empty", () => {
    expect(hasLocalWeddingData()).toBe(false)
  })

  it("is true when a table exists", () => {
    localStorage.setItem(
      PLANNER_STORAGE_KEY,
      JSON.stringify({
        state: {
          tables: [{ id: "t1" }],
          guests: [],
          fixtures: [],
          hall: { dimensions: { width: 20, height: 12 } },
        },
        version: 0,
      })
    )
    expect(hasLocalWeddingData()).toBe(true)
  })

  it("is true when only a wedding name was set", () => {
    localStorage.setItem(
      GLOBAL_STORAGE_KEY,
      JSON.stringify({ state: { name: "Our Wedding" }, version: 0 })
    )
    expect(hasLocalWeddingData()).toBe(true)
  })

  it("is false when the name is blank/whitespace", () => {
    localStorage.setItem(
      GLOBAL_STORAGE_KEY,
      JSON.stringify({ state: { name: "   " }, version: 0 })
    )
    expect(hasLocalWeddingData()).toBe(false)
  })

  // A guest whose only local data is a reminder still has something worth
  // migrating - this is what opens MigrateLocalWeddingDialog for them.
  it("is true when only a reminder exists", () => {
    persistReminders([{ uuid: "r1", text: "Book the band", status: "open" }])
    expect(hasLocalWeddingData()).toBe(true)
  })

  it("is false when every persisted reminder is malformed", () => {
    persistReminders([{ uuid: "r1", status: "open" }])
    expect(hasLocalWeddingData()).toBe(false)
  })
})

describe("clearLocalWeddingStorage", () => {
  it("removes every persisted key", () => {
    localStorage.setItem(PLANNER_STORAGE_KEY, "{}")
    localStorage.setItem(GLOBAL_STORAGE_KEY, "{}")
    localStorage.setItem(REMINDERS_STORAGE_KEY, "{}")
    clearLocalWeddingStorage()
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(GLOBAL_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(REMINDERS_STORAGE_KEY)).toBeNull()
  })
})

describe("storage access degrades to a no-op instead of throwing", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("clearLocalWeddingStorage doesn't throw when removeItem throws", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    expect(() => clearLocalWeddingStorage()).not.toThrow()
  })

  it("createLocalGatedStorage doesn't throw when the underlying calls throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    registerActiveWeddingIdGetter(() => LOCAL_WEDDING_ID)
    const storage = createLocalGatedStorage()

    expect(() => storage.getItem("k")).not.toThrow()
    expect(storage.getItem("k")).toBeNull()
    expect(() => storage.setItem("k", "v")).not.toThrow()
  })
})
