import type { Reminder } from "@/stores/reminders.store"
import { supabase } from "@/lib/supabase"
import { getWeddingId, run } from "@/lib/sync/mutations/shared"

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
