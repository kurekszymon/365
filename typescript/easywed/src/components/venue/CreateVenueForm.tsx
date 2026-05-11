import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { PlaceResult } from "@/components/venue/AddressAutocomplete"
import type { Venue } from "@/lib/venue/types"
import { createVenue } from "@/lib/sync/mutations"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/components/venue/AddressAutocomplete"

export function CreateVenueForm({
  onCreated,
}: {
  onCreated: (v: Venue) => void
}) {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const [name, setName] = useState("")
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!session || !name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    const venue = await createVenue(session.user.id, name.trim(), place)
    setSubmitting(false)
    if (!venue) {
      setError(t("common.error_generic"))
      return
    }
    onCreated(venue)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">
          {t("venue.dashboard.create_title")}
        </h1>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="venue-name">{t("onboarding.venue.name_label")}</Label>
          <Input
            id="venue-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("venue.dashboard.address_label")}</Label>
          <AddressAutocomplete onSelect={setPlace} />
        </div>
        <Button onClick={handleCreate} disabled={!name.trim() || submitting}>
          {t("common.create")}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
