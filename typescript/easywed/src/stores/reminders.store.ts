import { create } from "zustand"
import { insertReminder, updateReminderStatus } from "@/lib/sync/mutations"

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
  completeReminder: (guid: string) => {
    set((state) => ({
      reminders: state.reminders.map((reminder) =>
        reminder.uuid === guid
          ? { ...reminder, status: "completed", updatedAt: new Date() }
          : reminder
      ),
    }))
    void updateReminderStatus(guid, "completed")
  },
  setReminders: (text, due) => {
    const now = new Date()
    const reminder: Reminder = {
      uuid: crypto.randomUUID(),
      text,
      due,
      createdAt: now,
      updatedAt: now,
      status: "open",
    }
    set((state) => ({ reminders: [...state.reminders, reminder] }))
    void insertReminder(reminder)
  },
}))
