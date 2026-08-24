import type { Guest } from "@/stores/planner.store"
import { supabase } from "@/lib/supabase"
import { getWeddingId, run } from "@/lib/sync/mutations/shared"
import { toStoredAgeGroup } from "@/lib/ageGroup"

export const insertGuest = (guest: Guest): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertGuest",
    supabase.from("guests").insert({
      id: guest.id,
      wedding_id: weddingId,
      name: guest.name,
      dietary: guest.dietary,
      // Adults are stored as NULL - see toStoredAgeGroup.
      age_group: toStoredAgeGroup(guest.ageGroup),
      note: guest.note ?? null,
      table_id: guest.tableId,
      seat_id: guest.seatId ?? null,
      menu_option_id: guest.menuOptionId ?? null,
    })
  )
}

// Batch-inserts many guests in a single round-trip. Used by the CSV/XLSX
// import, which builds the whole list locally before persisting it at once.
export const insertGuests = (guests: Array<Guest>): Promise<boolean> => {
  if (guests.length === 0) return Promise.resolve(true)
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertGuests",
    supabase.from("guests").insert(
      guests.map((guest) => ({
        id: guest.id,
        wedding_id: weddingId,
        name: guest.name,
        dietary: guest.dietary,
        age_group: toStoredAgeGroup(guest.ageGroup),
        note: guest.note ?? null,
        table_id: guest.tableId,
        seat_id: guest.seatId ?? null,
        menu_option_id: guest.menuOptionId ?? null,
      }))
    )
  )
}

// Soft-deletes a guest (loadWedding filters on `deleted_at is null`), so they
// drop off the list without breaking any historical references.
export const softDeleteGuest = (id: string): Promise<boolean> =>
  run(
    "softDeleteGuest",
    supabase
      .from("guests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
  )

// Persists a guest's editable details (name, dietary, age group, note).
// Seat/table assignment is handled separately by `updateGuestSeat`, and the
// per-guest dish by `updateGuestMenuOption`, so this touches neither
// table_id/seat_id nor menu_option_id.
export const updateGuestDetails = (
  guest: Pick<Guest, "id" | "name" | "dietary" | "ageGroup" | "note">
): Promise<boolean> =>
  run(
    "updateGuestDetails",
    supabase
      .from("guests")
      .update({
        name: guest.name,
        dietary: guest.dietary,
        age_group: toStoredAgeGroup(guest.ageGroup),
        note: guest.note ?? null,
      })
      .eq("id", guest.id)
  )

// Pins (or clears) a guest's specific seat. Writes table_id alongside seat_id so
// seating and unseating stay consistent in one round-trip. Also the single path
// for plain table (re)assignment - seat_id must move with table_id, since the
// index-based seat ids aren't table-specific and a stale value would mis-pin.
export const updateGuestSeat = (
  guestId: string,
  tableId: string | null,
  seatId: string | null
): Promise<boolean> =>
  run(
    "updateGuestSeat",
    supabase
      .from("guests")
      .update({ table_id: tableId, seat_id: seatId })
      .eq("id", guestId)
  )

/**
 * Sets (or clears) one guest's dish.
 *
 * Its own mutation rather than a field folded into `updateGuestDetails`, for
 * exactly the reason `updateGuestSeat` is separate: the guest edit dialog
 * submits its whole form state, so folding this in would let a dialog opened
 * before a dish was assigned - or one open on another device - overwrite that
 * dish with a stale `null` the user never chose.
 *
 * `enforce_guest_menu_option` refuses anything that is not a dish of a
 * per-guest course of this wedding's package, with 23514.
 */
export const updateGuestMenuOption = (
  guestId: string,
  optionId: string | null
): Promise<boolean> =>
  run(
    "updateGuestMenuOption",
    supabase
      .from("guests")
      .update({ menu_option_id: optionId })
      .eq("id", guestId)
  )

export const reassignTableGuests = async (
  tableId: string,
  guestIds: Array<string>
): Promise<boolean> => {
  // Clear seat_id alongside table_id in both steps: seat ids are index-based and
  // not table-specific, so a guest removed from (or moved into) this table must
  // not keep a stale pin that would re-seat them at the wrong table on reload.
  // Callers that want to preserve specific pins (saveTable) re-persist seatIds
  // per guest after this resolves.
  const cleared = await run(
    "reassignTableGuests unassign",
    supabase
      .from("guests")
      .update({ table_id: null, seat_id: null })
      .eq("table_id", tableId)
  )
  if (guestIds.length === 0) return cleared
  const assigned = await run(
    "reassignTableGuests assign",
    supabase
      .from("guests")
      .update({ table_id: tableId, seat_id: null })
      .in("id", guestIds)
  )
  return cleared && assigned
}
