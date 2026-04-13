import { useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"

/**
 * Returns a stable callback that ensures the hall is initialised (assigns a
 * default preset when none exists) before opening the hall panel.  Centralises
 * the init-and-open flow so Planner header buttons and the Canvas empty-state
 * stay in sync automatically.
 */
export const useOpenHall = () => {
  const { hall, updateHall, resetZoomAndPan } = usePlannerStore(
    useShallow((state) => ({
      hall: state.hall,
      updateHall: state.updateHall,
      resetZoomAndPan: state.resetHallZoomAndPan,
    }))
  )
  const openHall = usePanelStore((state) => state.openHall)

  return useCallback(() => {
    if (!hall.preset) {
      updateHall("rectangle", hall.dimensions, hall.gridSpacing)
      resetZoomAndPan()
    }
    openHall()
  }, [hall, updateHall, resetZoomAndPan, openHall])
}
