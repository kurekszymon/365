import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { HallPreset } from "@/stores/planner.store"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { usePlannerStore } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"
import { clampGridSpacing } from "@/components/planner/Canvas/utils"

type TemplateRow = {
  id: string
  name: string
  description: string | null
  hall_preset: string
  width: number
  height: number
  creator_name: string | null
}

type Props = {
  open: boolean
  onClose: () => void
}

export function TemplatePicker({ open, onClose }: Props) {
  const { t } = useTranslation()
  const { updateHall, saveHall } = usePlannerStore((s) => ({
    updateHall: s.updateHall,
    saveHall: s.saveHall,
  }))
  const { gridSpacing, setGridSpacing } = useViewStore((s) => ({
    gridSpacing: s.gridSpacing,
    setGridSpacing: s.setGridSpacing,
  }))

  const [templates, setTemplates] = useState<Array<TemplateRow>>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<TemplateRow | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const load = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from("hall_templates")
        .select("id, name, description, hall_preset, width, height, creator_id")
        .eq("is_public", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[TemplatePicker] fetch", error)
        setLoading(false)
        return
      }

      if (data.length === 0) {
        setTemplates([])
        setLoading(false)
        return
      }

      // Resolve creator display names in one batched query.
      const creatorIds = [
        ...new Set(data.map((template) => template.creator_id)),
      ]
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", creatorIds)
      if (profilesError) {
        console.error("[TemplatePicker] profiles fetch", profilesError)
      }

      const nameById = new Map(
        (profiles ?? []).map((p) => [p.id, p.display_name])
      )

      const rows = data.map((tmpl) => ({
        ...tmpl,
        width: Number(tmpl.width),
        height: Number(tmpl.height),
        creator_name: nameById.get(tmpl.creator_id) ?? null,
      }))

      setTemplates(rows)
      setLoading(false)
    }

    void load()
  }, [open])

  const handleApplyClick = (tmpl: TemplateRow) => {
    setSelected(tmpl)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    if (!selected) return
    updateHall(selected.hall_preset as HallPreset, {
      width: selected.width,
      height: selected.height,
    })
    saveHall()
    const clamped = clampGridSpacing(
      gridSpacing,
      selected.width,
      selected.height
    )
    if (clamped !== gridSpacing) setGridSpacing(clamped)
    setConfirmOpen(false)
    setSelected(null)
    onClose()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose()
        }}
      >
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("templates.dialog_title")}</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("venue.templates.loading")}
              </p>
            ) : templates.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("templates.empty")}
              </p>
            ) : (
              templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{tmpl.name}</p>
                    {tmpl.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tmpl.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`hall.preset.${tmpl.hall_preset}`)} &middot;{" "}
                      {t("templates.dimensions", {
                        width: tmpl.width,
                        height: tmpl.height,
                      })}
                      {tmpl.creator_name && (
                        <>
                          {" "}
                          &middot;{" "}
                          {t("templates.by_venue", { name: tmpl.creator_name })}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplyClick(tmpl)}
                  >
                    {t("templates.apply")}
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next) {
            setConfirmOpen(false)
            setSelected(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("templates.apply_confirm")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("templates.apply_confirm_detail")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false)
                setSelected(null)
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleConfirm}>{t("templates.apply")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
