// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  GLOBAL_STORAGE_KEY,
  LOCAL_WEDDING_ID,
  PLANNER_STORAGE_KEY,
  clearLocalWeddingStorage,
  createLocalGatedStorage,
  hasLocalWeddingData,
  isLocalWedding,
  readLocalGlobalSnapshot,
  readLocalPlannerSnapshot,
  registerActiveWeddingIdGetter,
} from "./localWedding"

beforeEach(() => {
  localStorage.clear()
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
})

describe("clearLocalWeddingStorage", () => {
  it("removes both persisted keys", () => {
    localStorage.setItem(PLANNER_STORAGE_KEY, "{}")
    localStorage.setItem(GLOBAL_STORAGE_KEY, "{}")
    clearLocalWeddingStorage()
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(GLOBAL_STORAGE_KEY)).toBeNull()
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
