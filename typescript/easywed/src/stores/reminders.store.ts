import { create } from "zustand"
import { v4 as uuid } from "uuid"

export interface Reminder {
  uuid: string
  text: string
  createdAt: Date
  updatedAt: Date
  status: "open" | "completed"
  due?: Date
}

type State = {
  reminders: Array<Reminder>
}

type Action = {
  setReminders: (text: string, due?: Date) => void
  completeReminder: (uuid: string) => void
}

export const useRemindersStore = create<State & Action>((set) => ({
  reminders: [],
  completeReminder: (guid: string) =>
    set((state) => ({
      reminders: state.reminders.map((reminder) =>
        reminder.uuid === guid
          ? { ...reminder, status: "completed", updatedAt: new Date() }
          : reminder
      ),
    })),
  setReminders: (text, due) =>
    set((state) => {
      const date = new Date()
      return {
        reminders: [
          ...state.reminders,
          {
            uuid: uuid(),
            text,
            due,
            createdAt: date,
            updatedAt: date,
            status: "open",
          },
        ],
      }
    }),
}))
