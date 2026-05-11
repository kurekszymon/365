import { useEffect, useRef } from "react"
import { useMapsLibrary } from "@vis.gl/react-google-maps"
import { Input } from "@/components/ui/input"

export type PlaceResult = {
  address_text: string
  google_place_id: string
  lat: number
  lng: number
}

export function AddressAutocomplete({
  onSelect,
  placeholder,
}: {
  onSelect: (place: PlaceResult) => void
  placeholder?: string
}) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!places || !inputRef.current) return

    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "place_id", "geometry"],
    })

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      if (
        !place.place_id ||
        !place.formatted_address ||
        !place.geometry?.location
      )
        return
      onSelect({
        address_text: place.formatted_address,
        google_place_id: place.place_id,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      })
    })

    return () => google.maps.event.removeListener(listener)
  }, [places, onSelect])

  return <Input ref={inputRef} placeholder={placeholder} autoComplete="off" />
}
