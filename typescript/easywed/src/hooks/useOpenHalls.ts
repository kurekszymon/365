import { useCallback } from "react"
import { DEFAULT_HALL, usePlannerStore } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"
import { usePanelStore } from "@/stores/panel.store"

/**
 * Returns a stable callback that opens the halls panel. When the wedding has
 * no halls yet it first creates the default one (at world origin) and jumps
 * straight into its settings - centralising the init-and-open flow so the
 * Planner header button and the Canvas empty-state stay in sync.
 */
export const useOpenHalls = () => {
  const halls = usePlannerStore((state) => state.halls)
  const addHall = usePlannerStore((state) => state.addHall)
  const resetZoomAndPan = useViewStore((state) => state.resetZoomAndPan)
  const openHalls = usePanelStore((state) => state.openHalls)
  const openHallEdit = usePanelStore((state) => state.openHallEdit)

  return useCallback(() => {
    if (halls.length === 0) {
      const id = addHall(DEFAULT_HALL, { x: 0, y: 0 })
      resetZoomAndPan()
      openHallEdit(id)
      return
    }
    openHalls()
  }, [halls, addHall, resetZoomAndPan, openHalls, openHallEdit])
}
