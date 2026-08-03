import type { Reminder } from "@/stores/reminders.store"
import { supabase } from "@/lib/supabase"
import { getWeddingId, run } from "@/lib/sync/mutations/shared"

// `created_at` is sent rather than left to the column default so a batch
// migrated from a local wedding keeps its original creation order (the column
// is plain-insertable; only `updated_at` is trigger-managed).
const reminderRow = (reminder: Reminder, weddingId: string) => ({
  id: reminder.uuid,
  wedding_id: weddingId,
  text: reminder.text,
  due: reminder.due ? reminder.due.toISOString() : null,
  status: reminder.status,
  created_at: reminder.createdAt.toISOString(),
})

export const insertReminder = (reminder: Reminder): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertReminder",
    supabase.from("reminders").insert(reminderRow(reminder, weddingId))
  )
}

// Bulk counterpart used by the local-wedding migration
// (MigrateLocalWeddingDialog), where a guest's whole reminder list is written
// at once instead of one row per user action.
export const insertReminders = (
  reminders: Array<Reminder>
): Promise<boolean> => {
  if (reminders.length === 0) return Promise.resolve(true)
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertReminders",
    supabase
      .from("reminders")
      .insert(reminders.map((reminder) => reminderRow(reminder, weddingId)))
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

// Hard delete: `reminders` has no `deleted_at` column (unlike tables/guests,
// which loadWedding filters on), so removal is a real DELETE.
export const deleteReminder = (uuid: string): Promise<boolean> =>
  run("deleteReminder", supabase.from("reminders").delete().eq("id", uuid))
