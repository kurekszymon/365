import { useEffect, useRef } from "react"
import { importLibrary, setOptions } from "@googlemaps/js-api-loader"

export type PlaceResult = {
  address_text: string
  google_place_id: string
  lat: number
  lng: number
}

let mapsInitialized = false

function ensureMapsInitialized() {
  if (mapsInitialized) return
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  if (!apiKey) throw new Error("VITE_GOOGLE_MAPS_API_KEY is not set")
  setOptions({ key: apiKey })
  mapsInitialized = true
}

export function AddressAutocomplete({
  onSelect,
  placeholder,
}: {
  onSelect: (place: PlaceResult) => void
  placeholder?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Stable ref so the effect doesn't re-run when the caller re-renders
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let element: google.maps.places.PlaceAutocompleteElement | null = null
    let cancelled = false

    try {
      ensureMapsInitialized()
    } catch (err) {
      console.error("[AddressAutocomplete]", err)
      return
    }

    void importLibrary("places").then(() => {
      if (cancelled || !containerRef.current) return

      // PlaceAutocompleteElement lives on the global namespace after the
      // library loads; it is not on the PlacesLibrary destructure type yet.

      const El = google.maps.places.PlaceAutocompleteElement

      const el = new El({})
      if (placeholder) el.placeholder = placeholder
      element = el
      containerRef.current.appendChild(el)

      el.addEventListener(
        "gmp-select",
        ({
          placePrediction,
        }: google.maps.places.PlacePredictionSelectEvent) => {
          void (async () => {
            const place = placePrediction.toPlace()
            await place.fetchFields({
              fields: ["formattedAddress", "id", "location"],
            })
            if (!place.id || !place.formattedAddress || !place.location) return
            onSelect({
              address_text: place.formattedAddress,
              google_place_id: place.id,
              lat: place.location.lat(),
              lng: place.location.lng(),
            })
          })()
        }
      )
    })

    return () => {
      cancelled = true
      element?.remove()
    }
  }, [onSelect, placeholder])

  return <div ref={containerRef} />
}
