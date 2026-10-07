import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useLayoutPresets } from "./useLayoutPresets"
import type { LayoutPreset } from "@/lib/sync/layoutPresets"
import type { LinkedVenue } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { applyLayoutPreset } from "@/lib/sync/layoutPresets"
import { loadWedding } from "@/lib/sync/loadWedding"
import { track } from "@/lib/analytics/track"
import { usePlannerStore } from "@/stores/planner.store"

/**
 * The couple: replace this wedding's layout with a copy of one of their
 * venue's presets.
 *
 * The confirm is inline and says exactly what goes: `replace_planner_layout`
 * hard-deletes every hall, table and element, and anyone seated comes out
 * unassigned. The guest list itself survives - only the seating is lost.
 */
export const LayoutPresetPickSection = ({
  weddingId,
  venue,
  onApplied,
}: {
  weddingId: string
  venue: LinkedVenue
  onApplied: () => void
}) => {
  const { t } = useTranslation()
  const { presets } = useLayoutPresets(venue.tenantId)
  const [confirming, setConfirming] = useState<LayoutPreset | null>(null)
  const [applying, setApplying] = useState(false)

  const tableCount = usePlannerStore((state) => state.tables.length)
  const seatedCount = usePlannerStore(
    (state) => state.guests.filter((g) => g.tableId !== null).length
  )

  const apply = async (preset: LayoutPreset) => {
    setApplying(true)
    const ok = await applyLayoutPreset(weddingId, preset)

    if (ok) {
      // The store still holds the old layout, and guests' table ids now point
      // at rows the RPC deleted. Re-reading the wedding is the one way to get
      // both right without a second mapping of what the database decided.
      try {
        await loadWedding(weddingId, new AbortController().signal)
      } catch (e) {
        console.error("[layoutPresets] reload after apply failed", e)
      }
      track("layout_preset_applied")
      toast.success(t("layout_presets.applied", { name: preset.name }))
      onApplied()
    }
    // A failure has already been toasted by run().
    setApplying(false)
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {t("layout_presets.pick_title", { venue: venue.name })}
      </h3>

      {presets === undefined ? (
        <p className="text-sm text-muted-foreground">
          {t("layout_presets.loading")}
        </p>
      ) : presets === null ? (
        <p className="text-sm text-destructive">
          {t("layout_presets.load_failed")}
        </p>
      ) : presets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("layout_presets.pick_empty", { venue: venue.name })}
        </p>
      ) : confirming ? (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <p className="text-sm font-medium">{confirming.name}</p>
          {tableCount > 0 && (
            <p className="text-sm text-destructive">
              {seatedCount > 0
                ? t("layout_presets.replace_warning_seated", {
                    count: seatedCount,
                  })
                : t("layout_presets.replace_warning")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={applying}
              onClick={() => setConfirming(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant={tableCount > 0 ? "destructive" : "default"}
              disabled={applying}
              onClick={() => apply(confirming)}
            >
              {t("layout_presets.apply")}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {preset.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("layout_presets.summary", {
                    halls: preset.halls.length,
                    count: preset.tables.length,
                  })}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirming(preset)}
              >
                {t("layout_presets.use")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
