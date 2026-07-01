// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
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
        state: { tables: [{ id: "t1" }], guests: [], fixtures: [] },
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
})

describe("hasLocalWeddingData", () => {
  it("is false when storage is empty", () => {
    expect(hasLocalWeddingData()).toBe(false)
  })

  it("is true when a table exists", () => {
    localStorage.setItem(
      PLANNER_STORAGE_KEY,
      JSON.stringify({
        state: { tables: [{ id: "t1" }], guests: [], fixtures: [] },
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
