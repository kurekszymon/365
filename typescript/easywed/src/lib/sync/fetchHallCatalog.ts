import type { HallCatalogEntry } from "@/lib/venue/types"
import { supabase } from "@/lib/supabase"

export async function fetchHallCatalog(
  signal: AbortSignal
): Promise<Array<HallCatalogEntry>> {
  const { data, error } = await supabase
    .from("venue_halls")
    .select(
      "id, name, description, preset, width, height, venue:venues(name, address_text, lat, lng, google_place_id, venue_photos(id, storage_path, display_order, created_at))"
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .abortSignal(signal)

  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    preset: row.preset,
    width: Number(row.width),
    height: Number(row.height),
    venueName: row.venue.name,
    addressText: row.venue.address_text ?? null,
    lat: row.venue.lat ?? null,
    lng: row.venue.lng ?? null,
    googlePlaceId: row.venue.google_place_id ?? null,
    photos: row.venue.venue_photos
      .slice()
      .sort(
        (a, b) =>
          a.display_order - b.display_order ||
          a.created_at.localeCompare(b.created_at)
      ),
  }))
}
