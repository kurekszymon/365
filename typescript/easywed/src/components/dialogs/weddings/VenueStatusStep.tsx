import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { LinkedVenue, VenueAccess } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { setVenueAccess } from "@/lib/sync/venue"

/**
 * Where the wedding currently stands with its venue, and the one action that
 * changes it.
 *
 * Reads the state back rather than describing what the couple last clicked:
 * `venue_access` is server-owned (the columns are not client-writable at all),
 * so this sentence is the database's answer, not the UI's memory of a request.
 *
 * Revoking does not go through the disclosure screen. Consent needs to be
 * informed; withdrawing it needs to be *easy*, and putting a wall of text in
 * front of "stop sharing my guests' dietary data" would be the wrong asymmetry.
 */
export const VenueStatusStep = ({
  weddingId,
  venue,
  access,
  onGrantRequested,
}: {
  weddingId: string
  venue: LinkedVenue
  access: VenueAccess
  onGrantRequested: () => void
}) => {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const revoke = async () => {
    setSubmitting(true)
    setError(null)
    setMessage(null)

    const ok = await setVenueAccess(weddingId, false)

    setSubmitting(false)
    if (ok) setMessage(t("venue.revoke_done"))
    else setError(t("venue.failed"))
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {t(`venue.status.${access}`, { name: venue.name })}
      </p>

      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {access === "granted" ? (
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => void revoke()}
          >
            {t("venue.revoke")}
          </Button>
        ) : (
          <Button onClick={onGrantRequested}>{t("venue.grant.open")}</Button>
        )}
      </div>
    </div>
  )
}
