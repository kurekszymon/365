import { create } from "zustand"
import { persist } from "zustand/middleware"

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
    }),
    { name: "easywed.measures" }
  )
)
