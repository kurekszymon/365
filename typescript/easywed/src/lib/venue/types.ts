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
