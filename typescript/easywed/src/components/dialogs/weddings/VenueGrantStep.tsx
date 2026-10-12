import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { VenueDisclosureList } from "./VenueDisclosureList"
import type { LinkedVenue } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { localeDocPath } from "@/lib/site"
import { setVenueAccess } from "@/lib/sync/venue"
import { track } from "@/lib/analytics/track"

/**
 * The consent screen, and not optional.
 *
 * `privacy.venue.optin` - a published document - states that before the grant
 * "the app shows you a short version of this list - both halves of it ... and
 * asks you to confirm". This component is that sentence. Shipping the grant
 * without it would make a binding published statement false.
 *
 * So the two lists below are a short version of `privacy.venue.shared` and
 * `privacy.venue.hidden`, covering every category in each, and the caveat is
 * the policy's own
 * honest limit repeated where the decision is actually made: `dietary` and
 * `age_group` are free text, so the projection guarantee covers the fields we
 * never send, not what someone typed into the fields we do.
 *
 * A policy paragraph alone does not make consent informed - nobody reads a
 * policy at the moment they decide. This does.
 */
export const VenueGrantStep = ({
  weddingId,
  venue,
  onDone,
  onCancel,
}: {
  weddingId: string
  venue: LinkedVenue
  onDone: () => void
  onCancel: () => void
}) => {
  const { t, i18n } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grant = async () => {
    setSubmitting(true)
    setError(null)

    const ok = await setVenueAccess(weddingId, true)

    setSubmitting(false)
    if (!ok) {
      setError(t("venue.failed"))
      return
    }
    track("venue_access_granted")
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-medium">
        {t("venue.grant.title", { name: venue.name })}
      </p>

      <VenueDisclosureList
        title={t("venue.grant.shared_title")}
        tone="shared"
        items={[
          t("venue.grant.shared_1"),
          t("venue.grant.shared_2"),
          // The per-guest dish (20260822000003). This list is not decoration:
          // privacy.venue.optin promises in writing that the app shows this
          // list, so a column the venue reads and this list does not name
          // makes a published document false.
          t("venue.grant.shared_4"),
          t("venue.grant.shared_3"),
        ]}
      />

      <VenueDisclosureList
        title={t("venue.grant.hidden_title")}
        tone="hidden"
        items={[
          t("venue.grant.hidden_1"),
          t("venue.grant.hidden_2"),
          t("venue.grant.hidden_3"),
        ]}
      />

      <p className="text-sm text-muted-foreground">{t("venue.grant.caveat")}</p>
      <p className="text-sm text-muted-foreground">{t("venue.grant.legal")}</p>

      {/* New tab, like every other legal link in the app: reading the policy
          must never cost someone the plan they have open. */}
      <Link
        to={localeDocPath("privacy", i18n.language)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline underline-offset-4"
      >
        {t("venue.grant.policy")}
      </Link>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={submitting} onClick={() => void grant()}>
          {t("venue.grant.confirm")}
        </Button>
        <Button variant="ghost" disabled={submitting} onClick={onCancel}>
          {t("venue.grant.cancel")}
        </Button>
      </div>
    </div>
  )
}
