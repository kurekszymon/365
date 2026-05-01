import { create } from "zustand"
import { persist } from "zustand/middleware"

const ZOOM_MIN = 0.2
const ZOOM_MAX = 4

export type SnapStep = 0.1 | 0.25 | 0.5 | 1 | "off"
export type GridStyle = "dots" | "grid" | "off"
export type GridSpacing = 1 | 2 | 5 | 10 | 25 | 50 | "auto"
export type MeasureMode = "center" | "border"

type State = {
  zoom: number
  pan: { x: number; y: number }
  snapStep: SnapStep
  gridStyle: GridStyle
  gridSpacing: GridSpacing
  isMeasuring: boolean
  measureMode: MeasureMode
}

type Action = {
  resetZoomAndPan: () => void
  stepZoom: (direction: 1 | -1) => void
  setPan: (pan: { x: number; y: number }) => void
  setSnapStep: (step: SnapStep) => void
  setGridStyle: (style: GridStyle) => void
  setGridSpacing: (spacing: GridSpacing) => void
  toggleMeasuring: () => void
  setMeasureMode: (mode: MeasureMode) => void
}

export const useViewStore = create<State & Action>()(
  persist(
    (set) => ({
      zoom: 1,
      pan: { x: 0, y: 0 },
      snapStep: 1,
      gridStyle: "grid",
      gridSpacing: 1,
      isMeasuring: false,
      measureMode: "center",
      resetZoomAndPan: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
      stepZoom: (direction) =>
        set((state) => ({
          // ref: https://gamedev.net/forums/topic/666225-equation-for-zooming/
          // Math.exp is the inverse of Math.log, so it's converting to log-space, applying the zoom delta, then converting back.
          // modify the direction (+ or -) to control zoom in vs zoom out
          zoom: Math.max(
            ZOOM_MIN,
            Math.min(
              ZOOM_MAX,
              Math.exp(Math.log(state.zoom) + direction * 0.08)
            )
          ),
        })),
      setPan: (pan) => set({ pan }),
      setSnapStep: (step) => set({ snapStep: step }),
      setGridStyle: (style) => set({ gridStyle: style }),
      setGridSpacing: (spacing) => set({ gridSpacing: spacing }),
      toggleMeasuring: () =>
        set((state) => ({ isMeasuring: !state.isMeasuring })),
      setMeasureMode: (mode) => set({ measureMode: mode }),
    }),
    { name: "easywed.view" }
  )
)
