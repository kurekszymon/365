import { useState } from "react"
import { useTranslation } from "react-i18next"
import { VenueDisclosureList } from "./VenueDisclosureList"
import type { LinkedVenue } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { setVenueAccess } from "@/lib/sync/venue"
import { track } from "@/lib/analytics/track"

/**
 * The consent screen. Track A item 6, and not optional.
 *
 * `privacy.venue.optin` - a published document, effective on a date the § 16
 * ust. 2 notice period is running against - states that "aplikacja pokazuje
 * dokladnie te liste i prosi o potwierdzenie". This component is that sentence.
 * Shipping the grant without it would not merely be a thinner UI; it would make
 * a binding published statement false.
 *
 * So the two lists below mirror `privacy.venue.shared` and
 * `privacy.venue.hidden` item for item, and the caveat is the policy's own
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

  const privacyHref = i18n.language.startsWith("pl")
    ? "/pl/privacy"
    : "/en/privacy"

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
      <a
        href={privacyHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline underline-offset-4"
      >
        {t("venue.grant.policy")}
      </a>

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
