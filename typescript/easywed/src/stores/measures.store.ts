import { create } from "zustand"
import { persist } from "zustand/middleware"
import { track } from "@/lib/analytics/track"

export interface MeasurementPoint {
  x: number
  y: number
  /** If the point was snapped to an object, its id is stored here. */
  objectId?: string
}

export interface Measurement {
  id: string
  a: MeasurementPoint
  b: MeasurementPoint
}

type State = {
  byWedding: Record<string, Array<Measurement>>
}

type Action = {
  addMeasurement: (
    weddingId: string,
    a: MeasurementPoint,
    b: MeasurementPoint
  ) => void
  deleteMeasurement: (weddingId: string, id: string) => void
  clearAll: (weddingId: string) => void
  shiftMeasurementPoints: (
    weddingId: string,
    objectId: string,
    dx: number,
    dy: number
  ) => void
  removeObjectMeasurements: (weddingId: string, objectId: string) => void
  // Puts back lines removeObjectMeasurements dropped (undo of a delete);
  // ones already present are skipped.
  restoreMeasurements: (
    weddingId: string,
    measurements: Array<Measurement>
  ) => void
  updateMeasurementPoint: (
    weddingId: string,
    measurementId: string,
    pointKey: "a" | "b",
    point: MeasurementPoint
  ) => void
}

export const useMeasuresStore = create<State & Action>()(
  persist(
    (set) => ({
      byWedding: {},

      addMeasurement: (weddingId, a, b) => {
        const id = crypto.randomUUID()
        set((state) => ({
          byWedding: {
            ...state.byWedding,
            [weddingId]: [...(state.byWedding[weddingId] ?? []), { id, a, b }],
          },
        }))
        track("measure_added", {
          snapped: ((a.objectId ? 1 : 0) + (b.objectId ? 1 : 0)) as 0 | 1 | 2,
        })
      },

      deleteMeasurement: (weddingId, id) => {
        set((state) => ({
          byWedding: {
            ...state.byWedding,
            [weddingId]: (state.byWedding[weddingId] ?? []).filter(
              (m) => m.id !== id
            ),
          },
        }))
      },

      clearAll: (weddingId) => {
        set((state) => ({
          byWedding: { ...state.byWedding, [weddingId]: [] },
        }))
      },

      shiftMeasurementPoints: (weddingId, objectId, dx, dy) => {
        set((state) => ({
          byWedding: {
            ...state.byWedding,
            [weddingId]: (state.byWedding[weddingId] ?? []).map((m) => ({
              ...m,
              a:
                m.a.objectId === objectId
                  ? { ...m.a, x: m.a.x + dx, y: m.a.y + dy }
                  : m.a,
              b:
                m.b.objectId === objectId
                  ? { ...m.b, x: m.b.x + dx, y: m.b.y + dy }
                  : m.b,
            })),
          },
        }))
      },

      updateMeasurementPoint: (weddingId, measurementId, pointKey, point) => {
        set((state) => ({
          byWedding: {
            ...state.byWedding,
            [weddingId]: (state.byWedding[weddingId] ?? []).map((m) =>
              m.id === measurementId
                ? {
                    ...m,
                    a: pointKey === "a" ? point : m.a,
                    b: pointKey === "b" ? point : m.b,
                  }
                : m
            ),
          },
        }))
      },

      removeObjectMeasurements: (weddingId, objectId) => {
        set((state) => ({
          byWedding: {
            ...state.byWedding,
            [weddingId]: (state.byWedding[weddingId] ?? []).filter(
              (m) => m.a.objectId !== objectId && m.b.objectId !== objectId
            ),
          },
        }))
      },

      restoreMeasurements: (weddingId, measurements) => {
        if (measurements.length === 0) return
        set((state) => {
          const current = state.byWedding[weddingId] ?? []
          const present = new Set(current.map((m) => m.id))
          return {
            byWedding: {
              ...state.byWedding,
              [weddingId]: [
                ...current,
                ...measurements.filter((m) => !present.has(m.id)),
              ],
            },
          }
        })
      },
    }),
    { name: "easywed.measures" }
  )
)
