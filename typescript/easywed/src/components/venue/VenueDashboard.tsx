import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import type { PlaceResult } from "@/components/venue/AddressAutocomplete"
import type { Hall, Venue } from "@/lib/venue/types"
import { updateVenueAddress } from "@/lib/sync/mutations"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { AddressAutocomplete } from "@/components/venue/AddressAutocomplete"
import { CreateVenueForm } from "@/components/venue/CreateVenueForm"
import { CreateHallForm } from "@/components/venue/CreateHallForm"
import { HallRow } from "@/components/venue/HallRow"
import { VenuePhotoGallery } from "@/components/venue/VenuePhotoGallery"

export function VenueDashboard() {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [halls, setHalls] = useState<Array<Hall>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingAddress, setEditingAddress] = useState(false)
  const [pendingPlace, setPendingPlace] = useState<PlaceResult | null>(null)

  useEffect(() => {
    if (!session) return
    const ctrl = new AbortController()
    const state = { cancelled: false }
    const isCancelled = () => state.cancelled

    void (async () => {
      const venueRes = await supabase
        .from("venues")
        .select("id, name, address_text, google_place_id, lat, lng")
        .eq("owner_id", session.user.id)
        .abortSignal(ctrl.signal)
        .maybeSingle()

      if (isCancelled()) return
      if (venueRes.error) {
        setError(venueRes.error.message)
        setLoading(false)
        return
      }
      setVenue(venueRes.data)

      if (venueRes.data) {
        const hallsRes = await supabase
          .from("venue_halls")
          .select("id, name, preset, width, height, is_public")
          .eq("venue_id", venueRes.data.id)
          .order("created_at", { ascending: false })
          .abortSignal(ctrl.signal)

        if (isCancelled()) return
        if (hallsRes.error) {
          setError(hallsRes.error.message)
        } else {
          setHalls(
            hallsRes.data.map((h) => ({
              id: h.id,
              name: h.name,
              preset: h.preset,
              width: Number(h.width),
              height: Number(h.height),
              is_public: h.is_public,
            }))
          )
        }
      }
      setLoading(false)
    })()

    return () => {
      state.cancelled = true
      ctrl.abort()
    }
  }, [session])

  if (loading) {
    return (
      <p className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {t("venue.dashboard.loading")}
      </p>
    )
  }

  if (!venue) {
    return <CreateVenueForm onCreated={setVenue} />
  }

  const handleSaveAddress = async () => {
    if (!pendingPlace) return
    const ok = await updateVenueAddress(venue.id, pendingPlace)
    if (!ok) return
    setVenue((v) => v && { ...v, ...pendingPlace })
    setPendingPlace(null)
    setEditingAddress(false)
  }

  const directionsUrl =
    venue.lat != null && venue.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}${venue.google_place_id ? `&query_place_id=${venue.google_place_id}` : ""}`
      : null

  return (
    <div className="flex min-h-svh flex-col items-center p-6">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{venue.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t("venue.dashboard.subtitle")}
            </p>
            {editingAddress ? (
              <div className="flex items-center gap-2 pt-1">
                <AddressAutocomplete onSelect={setPendingPlace} />
                <Button
                  size="sm"
                  onClick={handleSaveAddress}
                  disabled={!pendingPlace}
                >
                  {t("common.save")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPendingPlace(null)
                    setEditingAddress(false)
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-1">
                {venue.address_text ? (
                  <span className="text-sm text-muted-foreground">
                    {venue.address_text}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground/60">
                    {t("venue.dashboard.no_address")}
                  </span>
                )}
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline underline-offset-4"
                  >
                    {t("venue.dashboard.get_directions")}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setEditingAddress(true)}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {t("venue.dashboard.edit_address")}
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("auth.sign_out")}
          </button>
        </div>

        <VenuePhotoGallery venueId={venue.id} />

        <CreateHallForm
          venueId={venue.id}
          onCreated={(hall) => setHalls((prev) => [hall, ...prev])}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2">
          {halls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("venue.halls.empty")}
            </p>
          ) : (
            halls.map((hall) => (
              <HallRow
                key={hall.id}
                hall={hall}
                onUpdated={(updated) =>
                  setHalls((prev) =>
                    prev.map((h) => (h.id === updated.id ? updated : h))
                  )
                }
                onDeleted={(id) =>
                  setHalls((prev) => prev.filter((h) => h.id !== id))
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
