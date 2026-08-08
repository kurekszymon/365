import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  deleteReminder,
  insertReminder,
  updateReminderStatus,
} from "@/lib/sync/mutations"
import { track } from "@/lib/analytics/track"
import {
  REMINDERS_STORAGE_KEY,
  localRemindersStorage,
  normalizeLocalRemindersSnapshot,
} from "@/lib/localWedding"

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
  removeReminder: (uuid: string) => void
}

export const useRemindersStore = create<State & Action>()(
  persist(
    (set) => ({
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
      removeReminder: (uuid: string) => {
        set((state) => ({
          reminders: state.reminders.filter(
            (reminder) => reminder.uuid !== uuid
          ),
        }))
        void deleteReminder(uuid)
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
        // `text` is whatever the user typed, so only its presence is reported.
        track("reminder_created", { has_due_date: due != null })
      },
    }),
    {
      // Same local-only contract as planner.store/global.store: the gated
      // storage drops every write unless the active wedding is the local
      // sentinel, so a signed-in user's reminders never land in localStorage,
      // and hydration is explicit (wedding.local.tsx) rather than on import -
      // loadWedding.ts is what fills this store for a cloud wedding.
      name: REMINDERS_STORAGE_KEY,
      skipHydration: true,
      storage: localRemindersStorage,
      partialize: (state) => ({ reminders: state.reminders }),
      // Dates round-trip through JSON as strings and guest-mode storage is
      // treated as potentially corrupted, so revive + validate on the way in.
      merge: (persisted, current) => ({
        ...current,
        reminders: normalizeLocalRemindersSnapshot(persisted),
      }),
    }
  )
)
