import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"

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
}

type HallRow = {
  id: string
  name: string
  description: string | null
  preset: string
  width: number
  height: number
  venue: {
    name: string
    address_text: string | null
    lat: number | null
    lng: number | null
    google_place_id: string | null
  } | null
}

type Status =
  | { kind: "loading" }
  | { kind: "ready"; entries: Array<HallCatalogEntry> }
  | { kind: "error"; message: string }

export function HallCatalog({
  onPick,
}: {
  onPick: (hall: HallCatalogEntry) => void
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>({ kind: "loading" })

  useEffect(() => {
    const ctrl = new AbortController()

    supabase
      .from("venue_halls")
      .select(
        "id, name, description, preset, width, height, venue:venues(name, address_text, lat, lng, google_place_id)"
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .abortSignal(ctrl.signal)
      .then(({ data, error }) => {
        if (ctrl.signal.aborted) return
        if (error) {
          setStatus({ kind: "error", message: error.message })
          return
        }
        const entries = (data as Array<HallRow>).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          preset: row.preset,
          width: Number(row.width),
          height: Number(row.height),
          venueName: row.venue?.name ?? "",
          addressText: row.venue?.address_text ?? null,
          lat: row.venue?.lat ?? null,
          lng: row.venue?.lng ?? null,
          googlePlaceId: row.venue?.google_place_id ?? null,
        }))
        setStatus({ kind: "ready", entries })
      })

    return () => ctrl.abort()
  }, [])

  if (status.kind === "loading") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("halls.catalog.loading")}
      </p>
    )
  }

  if (status.kind === "error") {
    return <p className="text-sm text-destructive">{status.message}</p>
  }

  if (status.entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("halls.catalog.empty")}
      </p>
    )
  }

  const groups = status.entries.reduce<Map<string, Array<HallCatalogEntry>>>(
    (acc, hall) => {
      const key = hall.venueName || ""
      const list = acc.get(key) ?? []
      list.push(hall)
      acc.set(key, list)
      return acc
    },
    new Map()
  )

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([venueName, halls]) => {
        const first = halls[0]
        const directionsUrl =
          first.lat != null && first.lng != null
            ? `https://www.google.com/maps/search/?api=1&query=${first.lat},${first.lng}${first.googlePlaceId ? `&query_place_id=${first.googlePlaceId}` : ""}`
            : null
        return (
          <div key={venueName}>
            {venueName && (
              <div className="mb-2 flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{venueName}</p>
                {first.addressText && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {first.addressText}
                    </span>
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline underline-offset-4"
                      >
                        {t("halls.catalog.get_directions")}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {halls.map((hall) => (
                <button
                  key={hall.id}
                  type="button"
                  onClick={() => onPick(hall)}
                  className="flex w-36 cursor-pointer flex-col gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="text-sm leading-tight font-medium">
                    {hall.name || t("wedding.defaults.name")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {hall.preset}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {hall.width}×{hall.height} m
                  </span>
                  {hall.description && (
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {hall.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
