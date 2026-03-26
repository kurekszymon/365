import { create } from "zustand"

type State = {
  name: string
  date: Date
}

type Action = {
  setName: (name: string) => void
  setDate: (date: Date) => void
}

export const useGlobalStore = create<State & Action>((set) => ({
  name: "My perfect wedding",
  date: new Date(),

  setName: (name) => set({ name }),
  setDate: (date) => set({ date }),
}))
