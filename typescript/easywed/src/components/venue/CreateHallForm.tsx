import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { HallPreset } from "@/stores/planner.store"
import type { Hall } from "@/lib/venue/types"
import { createHall } from "@/lib/sync/mutations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CreateHallForm({
  venueId,
  onCreated,
}: {
  venueId: string
  onCreated: (hall: Hall) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [preset] = useState<HallPreset>("rectangle") // TODO: hardcode for now, add support for other presets later
  const [width, setWidth] = useState(20)
  const [height, setHeight] = useState(12)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    const hall = await createHall(venueId, name.trim(), preset, width, height)
    setSubmitting(false)
    if (!hall) {
      setError(t("common.error_generic"))
      return
    }
    onCreated(hall)
    setName("")
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">{t("venue.halls.create")}</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="hall-name">{t("common.name")}</Label>
          <Input
            id="hall-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hall-width">{t("common.width")}</Label>
          <Input
            id="hall-width"
            type="number"
            min={1}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hall-height">{t("common.height")}</Label>
          <Input
            id="hall-height"
            type="number"
            min={1}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button
          className="self-end"
          onClick={handleCreate}
          disabled={!name.trim() || width <= 0 || height <= 0 || submitting}
        >
          {t("common.create")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
