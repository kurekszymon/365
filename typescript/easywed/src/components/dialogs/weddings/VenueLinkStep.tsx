import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { LinkedVenue } from "@/stores/global.store"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { isTenantSlug } from "@/lib/tenant/host"
import { linkWeddingToVenue } from "@/lib/sync/venue"
import { track } from "@/lib/analytics/track"

/**
 * Step one: point the wedding at a venue by its subdomain label.
 *
 * Grants nothing. `link_wedding_to_venue` lands the wedding in `pending`, which
 * the venue cannot see at all - so this step is safe to get wrong, and the
 * consent decision happens in VenueGrantStep against a venue the couple can
 * see the real name of.
 *
 * `isTenantSlug` pre-checks the shape client-side purely to keep the button
 * disabled on obvious nonsense; the database's CHECK constraint is the
 * guarantee, and the reserved-label list here mirrors it.
 */
export const VenueLinkStep = ({
  weddingId,
  replacing = null,
  onLinked,
  onCancel,
}: {
  weddingId: string
  /**
   * The venue being replaced, when this is a change rather than a first link.
   *
   * Only used to say what is about to be lost. The write is identical -
   * `link_wedding_to_venue` resets `venue_access` to 'pending' and clears the
   * ordered package on any real change of `tenant_id`, so a re-link needs no
   * second RPC and gets no second code path here.
   */
  replacing?: LinkedVenue | null
  onLinked?: () => void
  /** Only offered on a change - a first link has nothing to go back to. */
  onCancel?: () => void
}) => {
  const { t } = useTranslation()
  const [slug, setSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const normalized = slug.trim().toLowerCase()
  const canSubmit = !submitting && isTenantSlug(normalized)

  const submit = async () => {
    setSubmitting(true)
    setError(null)

    const result = await linkWeddingToVenue(weddingId, normalized)

    setSubmitting(false)
    if (result.ok) {
      track("venue_access_requested", { source: "couple" })
      onLinked?.()
      return
    }
    setError(t(`venue.link.error.${result.reason}`))
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) void submit()
      }}
    >
      {replacing ? (
        <p className="text-sm text-muted-foreground">
          {t("venue.link.replacing", { name: replacing.name })}
        </p>
      ) : null}

      <Field>
        <FieldLabel htmlFor="venue-slug">
          {t("venue.link.slug_label")}
        </FieldLabel>
        <Input
          id="venue-slug"
          value={slug}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setSlug(e.target.value)}
        />
        <FieldDescription>{t("venue.link.slug_help")}</FieldDescription>
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {t("venue.link.submit")}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={onCancel}
          >
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
