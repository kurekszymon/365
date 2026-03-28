import { create } from "zustand"

interface Reminder {
  text: string
  createdAt: Date
  due?: Date
}

type State = {
  reminders: Array<Reminder>
}

type Action = {
  setReminders: (text: string, due?: Date) => void
}

export const useRemindersStore = create<State & Action>((set) => ({
  reminders: [],
  setReminders: (text, due) =>
    set((state) => ({
      reminders: [...state.reminders, { text, due, createdAt: new Date() }],
    })),
}))
