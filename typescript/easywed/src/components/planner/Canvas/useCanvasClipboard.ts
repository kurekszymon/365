import { useCallback } from "react"
import type { CapturedElement } from "./utils"
import type { Position } from "@/stores/planner.store"
import { useClipboardStore } from "@/stores/clipboard.store"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"

// Copy/paste for canvas tables and fixtures. Copy snapshots the currently
// selected element into the clipboard store; paste recreates it at a given
// hall position (under the cursor for ⌘V, or at the context-menu point).
export const useCanvasClipboard = () => {
  const copy = useClipboardStore((state) => state.copy)

  // Snapshot a table/fixture by id into the clipboard. Ids are unique across
  // both lists, so we don't need the caller to tell us which kind it is.
  const copyId = useCallback(
    (id: string) => {
      const { tables, fixtures } = usePlannerStore.getState()
      const table = tables.find((t) => t.id === id)
      if (table) {
        copy({ kind: "table", table })
        return true
      }
      const fixture = fixtures.find((f) => f.id === id)
      if (fixture) {
        copy({ kind: "fixture", fixture })
        return true
      }
      return false
    },
    [copy]
  )

  const copySelected = useCallback(() => {
    const selectedId = usePanelStore.getState().selectedId
    return selectedId ? copyId(selectedId) : false
  }, [copyId])

  // Copy the element a context menu was opened on (ignores the hall).
  const copyTarget = useCallback(
    (target: CapturedElement) => {
      if (target.kind === "hall") return
      copyId(target.id)
    },
    [copyId]
  )

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

  return { copySelected, copyTarget, paste }
}
