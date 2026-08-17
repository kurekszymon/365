import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { TagBadge } from "@/components/ui/tag-badge"
import { dietaryLabel, dietaryTone } from "@/lib/dietary"
import { setVenueAccess } from "@/lib/sync/venue"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"

/**
 * What the kitchen actually wants off this screen: how many places are laid,
 * and how many of each dietary requirement.
 *
 * Counted from the pseudonymous guests `loadWeddingForVenue` put in the planner
 * store, so there is no second query and nothing here can reach a name - the
 * rows never carried one.
 *
 * The "give up access" button is the venue's own half of the consent story. The
 * database lets staff call `set_venue_access(false)` and refuses them `true`
 * (see 20260817000002): a venue may hand back access it no longer needs, and
 * may never take it.
 */
export const VenuePeekSummary = ({ weddingId }: { weddingId: string }) => {
  const { t } = useTranslation()

  const guests = usePlannerStore((s) => s.guests)
  const { venue, venueAccess } = useGlobalStore(
    useShallow((s) => ({ venue: s.venue, venueAccess: s.venueAccess }))
  )

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const seated = guests.filter((g) => g.tableId !== null).length

  // Sorted by count so the biggest catering commitment leads, then
  // alphabetically so equal counts do not reshuffle between loads.
  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const guest of guests) {
      for (const tag of guest.dietary) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )
  }, [guests])

  const release = async () => {
    setSubmitting(true)
    const ok = await setVenueAccess(weddingId, false)
    setSubmitting(false)
    setMessage(
      t(ok ? "crm.wedding.release_done" : "crm.wedding.release_failed")
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">
        {t("crm.wedding.seated", { count: seated })}
      </p>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t("crm.wedding.dietary_title")}</p>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("crm.wedding.dietary_none")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(([tag, count]) => (
              <TagBadge key={tag} tone={dietaryTone(tag)}>
                {dietaryLabel(t, tag)} · {count}
              </TagBadge>
            ))}
          </div>
        )}
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}

      {venue && venueAccess === "granted" ? (
        <Button
          variant="outline"
          className="self-start"
          disabled={submitting}
          onClick={() => void release()}
        >
          {t("crm.wedding.release")}
        </Button>
      ) : null}
    </div>
  )
}
