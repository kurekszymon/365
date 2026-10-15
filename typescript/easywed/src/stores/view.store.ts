import { create } from "zustand"
import { persist } from "zustand/middleware"

export const ZOOM_MIN = 0.2
export const ZOOM_MAX = 8

const clampZoom = (zoom: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))

/**
 * One zoom-button step from `zoom`: convert to log space, apply the delta,
 * convert back, so each click scales by the same factor at any zoom level.
 * `direction` (+/-) picks in vs out. The canvas animates toward it - see
 * useCameraAnimation.
 */
// ref: https://gamedev.net/forums/topic/666225-equation-for-zooming/
export const steppedZoom = (zoom: number, direction: 1 | -1) =>
  clampZoom(Math.exp(Math.log(zoom) + direction * 0.08))

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
  showSeats: boolean
}

type Action = {
  resetZoomAndPan: () => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  setSnapStep: (step: SnapStep) => void
  setGridStyle: (style: GridStyle) => void
  setGridSpacing: (spacing: GridSpacing) => void
  toggleMeasuring: () => void
  setMeasureMode: (mode: MeasureMode) => void
  toggleSeats: () => void
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
      showSeats: false,
      resetZoomAndPan: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
      setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
      setPan: (pan) => set({ pan }),
      setSnapStep: (step) => set({ snapStep: step }),
      setGridStyle: (style) => set({ gridStyle: style }),
      setGridSpacing: (spacing) => set({ gridSpacing: spacing }),
      toggleMeasuring: () =>
        set((state) => ({ isMeasuring: !state.isMeasuring })),
      setMeasureMode: (mode) => set({ measureMode: mode }),
      toggleSeats: () => set((state) => ({ showSeats: !state.showSeats })),
    }),
    { name: "easywed.view" }
  )
)
