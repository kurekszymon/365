import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ArchiveIcon } from "lucide-react"
import { useLayoutPresets } from "./useLayoutPresets"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  archiveLayoutPreset,
  saveLayoutPreset,
  snapshotLayout,
} from "@/lib/sync/layoutPresets"
import { track } from "@/lib/analytics/track"
import { usePlannerStore } from "@/stores/planner.store"

/**
 * Venue staff: save the layout on screen as one of the venue's presets, and
 * retire old ones.
 *
 * There is no preset editor. Staff draw the room in an ordinary wedding - a
 * demo one of their own - and snapshot it here, so the planner they already
 * know is the editor. Saving again under a new name is how a preset is revised.
 */
export const LayoutPresetSaveSection = ({ tenantId }: { tenantId: string }) => {
  const { t } = useTranslation()
  const { presets, reload } = useLayoutPresets(tenantId)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const { halls, tables, fixtures } = usePlannerStore(
    useShallow((state) => ({
      halls: state.halls,
      tables: state.tables,
      fixtures: state.fixtures,
    }))
  )

  const canSave = !saving && halls.length > 0 && name.trim().length > 0

  const save = async () => {
    setSaving(true)
    const ok = await saveLayoutPreset(
      tenantId,
      name,
      snapshotLayout(halls, tables, fixtures)
    )
    setSaving(false)

    if (!ok) {
      toast.error(t("layout_presets.save_failed"))
      return
    }
    track("layout_preset_saved")
    toast.success(t("layout_presets.saved"))
    setName("")
    reload()
  }

  const archive = async (id: string) => {
    if (!(await archiveLayoutPreset(id))) {
      toast.error(t("layout_presets.archive_failed"))
      return
    }
    reload()
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {t("layout_presets.save_title")}
      </h3>

      <Field>
        <FieldLabel htmlFor="layout-preset-name">
          {t("layout_presets.name_label")}
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id="layout-preset-name"
            value={name}
            maxLength={60}
            placeholder={t("layout_presets.name_placeholder")}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSave) void save()
            }}
          />
          <Button type="button" disabled={!canSave} onClick={save}>
            {t("common.save")}
          </Button>
        </div>
        <FieldDescription>
          {halls.length === 0
            ? t("layout_presets.save_empty")
            : t("layout_presets.save_help", {
                tables: tables.length,
                halls: halls.length,
              })}
        </FieldDescription>
      </Field>

      {presets && presets.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm">{preset.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("layout_presets.archive")}
                title={t("layout_presets.archive")}
                onClick={() => archive(preset.id)}
              >
                <ArchiveIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
