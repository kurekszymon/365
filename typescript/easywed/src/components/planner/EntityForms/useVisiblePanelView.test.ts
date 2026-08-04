// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { useVisiblePanelView } from "./useVisiblePanelView"
import { usePanelStore } from "@/stores/panel.store"
import { useGlobalStore } from "@/stores/global.store"

const TABLE = "44444444-4444-4444-4444-444444444444"

afterEach(() => {
  usePanelStore.setState({ view: null, selectedId: null })
  useGlobalStore.setState({ weddingId: undefined, role: undefined })
  localStorage.clear()
})

describe("useVisiblePanelView", () => {
  it("passes an editor every view through untouched", () => {
    useGlobalStore.setState({ role: "editor" })
    usePanelStore.getState().openAddHub()

    const { result } = renderHook(() => useVisiblePanelView())

    expect(result.current).toEqual({ kind: "add_hub" })
  })

  it("still gives a viewer the read-only edit forms", () => {
    useGlobalStore.setState({ role: "viewer" })
    usePanelStore.getState().openTableEdit(TABLE)

    const { result } = renderHook(() => useVisiblePanelView())

    // The form renders disabled rather than not at all - a viewer needs to read
    // a table's capacity and dimensions.
    expect(result.current).toEqual({ kind: "table.edit", tableId: TABLE })
  })

  // The host opens on this return value, so null is what keeps a drawer or
  // dialog from rendering its title and close button around nothing.
  it("hides a write-only view from a viewer", () => {
    useGlobalStore.setState({ role: "viewer" })
    usePanelStore.getState().openAddHub()

    const { result } = renderHook(() => useVisiblePanelView())

    expect(result.current).toBeNull()
  })

  // panel.store is a module-level singleton nothing resets between weddings:
  // open the add hub in a wedding you edit, move to one you only view, and the
  // view is still set. Leaving it there would spring the drawer open unbidden
  // the moment canEdit went true again.
  it("clears the blocked view from the store, not just from its own output", () => {
    useGlobalStore.setState({ role: "viewer" })
    usePanelStore.getState().openAiChat()

    renderHook(() => useVisiblePanelView())

    expect(usePanelStore.getState().view).toBeNull()
  })

  // The pre-load state is indistinguishable from "no membership row", so it
  // fails closed the same way selectCanEdit does.
  it("hides a write-only view while the role is still loading", () => {
    usePanelStore.getState().openTablesBatchAdd()

    const { result } = renderHook(() => useVisiblePanelView())

    expect(result.current).toBeNull()
  })
})
