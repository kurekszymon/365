import { useState } from "react"
import { useTranslation } from "react-i18next"
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
export const VenueLinkStep = ({ weddingId }: { weddingId: string }) => {
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

      <Button type="submit" disabled={!canSubmit} className="self-start">
        {t("venue.link.submit")}
      </Button>
    </form>
  )
}
