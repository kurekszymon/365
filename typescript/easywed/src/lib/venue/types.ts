export type Venue = {
  id: string
  name: string
  address_text: string | null
  google_place_id: string | null
  lat: number | null
  lng: number | null
}

export type Hall = {
  id: string
  name: string
  preset: string
  width: number
  height: number
  is_public: boolean
}

export type VenueAddress = {
  address_text: string
  google_place_id: string
  lat: number
  lng: number
}

export type VenuePhoto = {
  id: string
  venue_id: string
  storage_path: string
  display_order: number
  created_at: string
}

export type VenuePhotoInCatalog = {
  id: string
  storage_path: string
  display_order: number
  created_at: string
}

export type HallCatalogEntry = {
  id: string
  name: string
  description: string | null
  preset: string
  width: number
  height: number
  venueName: string
  addressText: string | null
  lat: number | null
  lng: number | null
  googlePlaceId: string | null
  photos: Array<VenuePhotoInCatalog>
}
