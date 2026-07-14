import { toast } from "sonner"
import type { Reminder } from "@/stores/reminders.store"
import { supabase } from "@/lib/supabase"
import { getWeddingId, run } from "@/lib/sync/mutations/shared"
import { isLocalWedding } from "@/lib/localWedding"
import { useGlobalStore } from "@/stores/global.store"
import i18n from "@/i18n"

export const insertReminder = (reminder: Reminder): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertReminder",
    supabase.from("reminders").insert({
      id: reminder.uuid,
      wedding_id: weddingId,
      text: reminder.text,
      due: reminder.due ? reminder.due.toISOString() : null,
      status: reminder.status,
      recipient_email: reminder.recipientEmail ?? null,
    })
  )
}

export const updateReminderStatus = (
  uuid: string,
  status: Reminder["status"]
): Promise<boolean> =>
  run(
    "updateReminderStatus",
    supabase.from("reminders").update({ status }).eq("id", uuid)
  )

// Persists edits to a reminder's content/due/recipient. `due` and
// `recipientEmail` are passed as `null` to clear them (the form always sends the
// full current value), unlike an `undefined` which would leave the column alone.
export const updateReminder = (
  uuid: string,
  fields: { text: string; due: string | null; recipientEmail: string | null }
): Promise<boolean> =>
  run(
    "updateReminder",
    supabase
      .from("reminders")
      .update({
        text: fields.text,
        due: fields.due,
        recipient_email: fields.recipientEmail,
      })
      .eq("id", uuid)
  )

export const deleteReminder = (uuid: string): Promise<boolean> =>
  run("deleteReminder", supabase.from("reminders").delete().eq("id", uuid))

export type ReminderEmailAction = "send" | "schedule" | "reschedule" | "cancel"

export interface ReminderEmailResult {
  emailStatus: Reminder["emailStatus"]
  scheduledEmailId: string | null
  sentAt: string | null
}

// Invokes the `reminders-email` edge function, which talks to Resend and writes
// the resulting email state back to the row (using the forwarded JWT). Returns
// the authoritative fields so the store can reconcile its optimistic state.
// No-ops for the device-local guest wedding (no Supabase row to act on).
export const invokeReminderEmail = async (
  reminderId: string,
  action: ReminderEmailAction
): Promise<ReminderEmailResult | null> => {
  if (isLocalWedding(useGlobalStore.getState().weddingId)) return null

  const locale = i18n.language.startsWith("en") ? "en" : "pl"
  const { data, error } = await supabase.functions.invoke("reminders-email", {
    body: { reminderId, action, locale },
  })

  if (error) {
    console.error("[sync] invokeReminderEmail", error)
    toast.error(i18n.t("reminders.email.failed"), {
      id: "reminder-email-error",
    })
    return null
  }

  const r = (data as { reminder?: Record<string, unknown> } | null)?.reminder
  if (!r) return null

  return {
    emailStatus: r.email_status as Reminder["emailStatus"],
    scheduledEmailId: (r.scheduled_email_id as string | null) ?? null,
    sentAt: (r.sent_at as string | null) ?? null,
  }
}
