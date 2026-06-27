import { useCallback } from "react"
import type { Position } from "@/stores/planner.store"
import { useClipboardStore } from "@/stores/clipboard.store"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"

// Copy/paste for canvas tables and fixtures. Copy snapshots the currently
// selected element into the clipboard store; paste recreates it at a given
// hall position (under the cursor for ⌘V, or at the context-menu point).
export const useCanvasClipboard = () => {
  const copy = useClipboardStore((state) => state.copy)

  const copySelected = useCallback(() => {
    const selectedId = usePanelStore.getState().selectedId
    if (!selectedId) return false
    const { tables, fixtures } = usePlannerStore.getState()

    const table = tables.find((t) => t.id === selectedId)
    if (table) {
      copy({ kind: "table", table })
      return true
    }
    const fixture = fixtures.find((f) => f.id === selectedId)
    if (fixture) {
      copy({ kind: "fixture", fixture })
      return true
    }
    return false
  }, [copy])

  const paste = useCallback((position: Position) => {
    const item = useClipboardStore.getState().item
    if (!item) return
    const { addTable, addFixture } = usePlannerStore.getState()
    const { openTableEdit, openFixtureEdit } = usePanelStore.getState()

    // addTable/addFixture regenerate id and position, so the snapshot's own
    // id/position are ignored. Size, shape, seats and geometry carry over;
    // guests do not — paste makes an empty copy.
    if (item.kind === "table") {
      openTableEdit(addTable(item.table, [], position))
    } else {
      openFixtureEdit(addFixture(item.fixture, position))
    }
  }, [])

  return { copySelected, paste }
}
