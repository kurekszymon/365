import { create } from "zustand"
import type { ReminderEmailResult } from "@/lib/sync/mutations/reminders"
import {
  deleteReminder as deleteReminderMutation,
  insertReminder,
  invokeReminderEmail,
  updateReminder as updateReminderMutation,
  updateReminderStatus,
} from "@/lib/sync/mutations"

export type ReminderEmailStatus =
  | "none"
  | "scheduled"
  | "sent"
  | "failed"
  | "canceled"

export interface Reminder {
  uuid: string
  text: string
  createdAt: Date
  updatedAt: Date
  status: "open" | "completed"
  due?: Date
  recipientEmail?: string
  emailStatus: ReminderEmailStatus
  scheduledEmailId?: string
  sentAt?: Date
}

type State = {
  reminders: Array<Reminder>
}

type Action = {
  setReminders: (text: string, due?: Date, recipientEmail?: string) => void
  updateReminder: (
    uuid: string,
    values: { text: string; due?: Date; recipientEmail?: string }
  ) => void
  completeReminder: (uuid: string) => void
  deleteReminder: (uuid: string) => void
  sendReminderNow: (uuid: string) => void
}

export const useRemindersStore = create<State & Action>((set, get) => ({
  reminders: [],

  setReminders: (text, due, recipientEmail) => {
    const now = new Date()
    const reminder: Reminder = {
      uuid: crypto.randomUUID(),
      text,
      due,
      recipientEmail,
      createdAt: now,
      updatedAt: now,
      status: "open",
      emailStatus: "none",
    }
    set((state) => ({ reminders: [...state.reminders, reminder] }))
    // Persist first, then schedule: the edge function reads the row back through
    // RLS, so it must exist before we ask Resend to schedule the email.
    void (async () => {
      const ok = await insertReminder(reminder)
      if (ok) await reconcileEmail(reminder.uuid)
    })()
  },

  updateReminder: (uuid, values) => {
    const now = new Date()
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.uuid === uuid
          ? {
              ...r,
              text: values.text,
              due: values.due,
              recipientEmail: values.recipientEmail,
              updatedAt: now,
            }
          : r
      ),
    }))
    void (async () => {
      const ok = await updateReminderMutation(uuid, {
        text: values.text,
        due: values.due ? values.due.toISOString() : null,
        recipientEmail: values.recipientEmail ?? null,
      })
      if (ok) await reconcileEmail(uuid)
    })()
  },

  completeReminder: (uuid) => {
    const wasScheduled = get().reminders.find(
      (r) => r.uuid === uuid
    )?.scheduledEmailId
    set((state) => ({
      reminders: state.reminders.map((reminder) =>
        reminder.uuid === uuid
          ? { ...reminder, status: "completed", updatedAt: new Date() }
          : reminder
      ),
    }))
    void updateReminderStatus(uuid, "completed")
    // A completed reminder shouldn't still fire a pending email.
    if (wasScheduled) void cancelEmail(uuid)
  },

  deleteReminder: (uuid) => {
    const scheduledEmailId = get().reminders.find(
      (r) => r.uuid === uuid
    )?.scheduledEmailId
    set((state) => ({
      reminders: state.reminders.filter((r) => r.uuid !== uuid),
    }))
    // Cancel any pending scheduled email before deleting the row, so the edge
    // function can still read `scheduled_email_id` to cancel it in Resend.
    void (async () => {
      if (scheduledEmailId) await invokeReminderEmail(uuid, "cancel")
      void deleteReminderMutation(uuid)
    })()
  },

  sendReminderNow: (uuid) => {
    void (async () => {
      const res = await invokeReminderEmail(uuid, "send")
      if (res) applyEmailResult(uuid, res)
    })()
  },
}))

// Reflects the authoritative email state returned by the edge function onto the
// (still-mounted) reminder. A no-op if the reminder was removed meanwhile.
function applyEmailResult(uuid: string, res: ReminderEmailResult) {
  useRemindersStore.setState((state) => ({
    reminders: state.reminders.map((r) =>
      r.uuid === uuid
        ? {
            ...r,
            emailStatus: res.emailStatus,
            scheduledEmailId: res.scheduledEmailId ?? undefined,
            sentAt: res.sentAt ? new Date(res.sentAt) : undefined,
          }
        : r
    ),
  }))
}

async function cancelEmail(uuid: string) {
  const res = await invokeReminderEmail(uuid, "cancel")
  if (res) applyEmailResult(uuid, res)
}

// Decides what to do with the scheduled email after a create/edit: (re)schedule
// it when there's a recipient and a future due date on an open reminder, cancel
// it otherwise. Runs only after the row has been persisted.
async function reconcileEmail(uuid: string) {
  const r = useRemindersStore.getState().reminders.find((x) => x.uuid === uuid)
  if (!r) return

  const hasFutureDue = !!r.due && r.due.getTime() > Date.now()
  const wantsSchedule =
    !!r.recipientEmail && hasFutureDue && r.status === "open"

  if (wantsSchedule) {
    const action =
      r.emailStatus === "scheduled" && r.scheduledEmailId
        ? "reschedule"
        : "schedule"
    const res = await invokeReminderEmail(uuid, action)
    if (res) applyEmailResult(uuid, res)
  } else if (r.emailStatus === "scheduled" && r.scheduledEmailId) {
    await cancelEmail(uuid)
  }
}
