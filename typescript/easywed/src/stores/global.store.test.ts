// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { selectCanEdit } from "./global.store"

describe("selectCanEdit", () => {
  it("lets an owner edit", () => {
    expect(selectCanEdit({ role: "owner" })).toBe(true)
  })

  it("lets an editor edit", () => {
    expect(selectCanEdit({ role: "editor" })).toBe(true)
  })

  // The case this selector exists for: viewers were being handed the full
  // editing surface, and their changes reverted on the next load.
  it("refuses a viewer", () => {
    expect(selectCanEdit({ role: "viewer" })).toBe(false)
  })

  // Both the pre-load state and the "no wedding_members row" state. Defaulting
  // either to editable would flash write affordances before loadWedding lands.
  it("fails closed on an unknown role", () => {
    expect(selectCanEdit({})).toBe(false)
    expect(selectCanEdit({ role: undefined })).toBe(false)
  })
})
