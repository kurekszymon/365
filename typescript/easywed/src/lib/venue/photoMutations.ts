import type { VenuePhoto } from "./types"
import { supabase } from "@/lib/supabase"

const log = (label: string, error: unknown) =>
  console.error(`[venue-photos] ${label}`, error)

export async function uploadVenuePhoto(
  venueId: string,
  file: File
): Promise<VenuePhoto | null> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const storagePath = `${venueId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("venue-photos")
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    log("upload", uploadError)
    return null
  }

  const { data, error: insertError } = await supabase
    .from("venue_photos")
    .insert({ venue_id: venueId, storage_path: storagePath, display_order: 0 })
    .select("id, venue_id, storage_path, display_order, created_at")
    .single()

  if (insertError) {
    log("insert row", insertError)
    void supabase.storage.from("venue-photos").remove([storagePath])
    return null
  }

  return data
}

export async function deleteVenuePhoto(id: string): Promise<boolean> {
  const { error } = await supabase.from("venue_photos").delete().eq("id", id)

  if (error) {
    log("delete", error)
    return false
  }

  return true
}

export async function fetchVenuePhotos(
  venueId: string,
  signal: AbortSignal
): Promise<Array<VenuePhoto>> {
  const { data, error } = await supabase
    .from("venue_photos")
    .select("id, venue_id, storage_path, display_order, created_at")
    .eq("venue_id", venueId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .abortSignal(signal)

  if (error) throw error
  return data
}

export function getVenuePhotoUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from("venue-photos")
    .getPublicUrl(storagePath)
  return data.publicUrl
}
