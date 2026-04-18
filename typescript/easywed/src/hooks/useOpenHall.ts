import { useCallback } from "react"
import { usePlannerStore } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"
import { usePanelStore } from "@/stores/panel.store"

/**
 * Returns a stable callback that ensures the hall is initialised (assigns a
 * default preset when none exists) before opening the hall panel.  Centralises
 * the init-and-open flow so Planner header buttons and the Canvas empty-state
 * stay in sync automatically.
 */
export const useOpenHall = () => {
  const hall = usePlannerStore((state) => state.hall)
  const updateHall = usePlannerStore((state) => state.updateHall)
  const resetZoomAndPan = useViewStore((state) => state.resetZoomAndPan)
  const openHall = usePanelStore((state) => state.openHall)

  return useCallback(() => {
    if (!hall.preset) {
      updateHall("rectangle", hall.dimensions)
      resetZoomAndPan()
    }
    openHall()
  }, [hall, updateHall, resetZoomAndPan, openHall])
}
