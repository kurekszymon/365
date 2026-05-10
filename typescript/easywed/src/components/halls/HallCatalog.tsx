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
}

type HallRow = {
  id: string
  name: string
  description: string | null
  preset: string
  width: number
  height: number
  venue: { name: string } | null
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
        "id, name, description, preset, width, height, venue:venues(name)"
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
      {Array.from(groups.entries()).map(([venueName, halls]) => (
        <div key={venueName}>
          {venueName && (
            <p className="mb-2 text-sm font-semibold">{venueName}</p>
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
      ))}
    </div>
  )
}
