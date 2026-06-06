import { useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { LayerMappingStep } from "./CreateWeddingFromDxfLayerMappingStep.tsx"
import { PreviewStep } from "./CreateWeddingFromDxfPreviewStep.tsx"
import type {
  DxfUnit,
  ImportPreview,
  ImportWarning,
  LayerMapping,
} from "@/lib/import/plannerDxf"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { parsePlannerDxf } from "@/lib/import/plannerDxf"
import { warningKey } from "@/lib/import/plannerDxfWarningKey"
import { replacePlannerLayout } from "@/lib/sync/mutations"

type Stage =
  | { kind: "file" }
  | {
      kind: "layers"
      raw: string
      layers: Array<string>
      mapping: LayerMapping
    }
  | {
      kind: "preview"
      raw: string
      mapping?: LayerMapping
      preview: ImportPreview
      warnings: Array<ImportWarning>
    }
  | { kind: "committing" }
  | { kind: "error"; message: string }

const formatWarnings = (
  warnings: Array<ImportWarning>,
  t: (key: string, opts?: Record<string, unknown>) => string
): string =>
  warnings
    .map((w) => {
      const base = t(warningKey(w.code), { count: w.count ?? 0 })
      return w.detail ? `${base} (${w.detail})` : base
    })
    .join(" · ")

export const CreateWeddingFromDxfDialog = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [stage, setStage] = useState<Stage>({ kind: "file" })
  const [unit, setUnit] = useState<DxfUnit>("m")

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
    }))
  )

  const reset = () => setStage({ kind: "file" })

  const onClose = () => {
    reset()
    dialog.close()
  }

  const onFileChosen = async (file: File) => {
    const text = await file.text()
    const result = parsePlannerDxf(text)
    setUnit(result.resolvedUnit)
    if (result.preview && result.detectedAsEasywed) {
      setStage({
        kind: "preview",
        raw: text,
        preview: result.preview,
        warnings: result.warnings,
      })
      return
    }
    if (result.layers.length > 0) {
      setStage({
        kind: "layers",
        raw: text,
        layers: result.layers,
        mapping: result.mapping,
      })
      return
    }
    setStage({
      kind: "error",
      message: formatWarnings(result.warnings, t),
    })
  }

  const onLayersConfirmed = (mapping: LayerMapping, raw: string) => {
    const result = parsePlannerDxf(raw, mapping, unit)
    if (!result.preview) {
      setStage({
        kind: "error",
        message: formatWarnings(result.warnings, t),
      })
      return
    }
    setStage({
      kind: "preview",
      raw,
      mapping,
      preview: result.preview,
      warnings: result.warnings,
    })
  }

  const onUnitChange = (next: DxfUnit) => {
    setUnit(next)
    setStage((prev) => {
      if (prev.kind !== "preview") return prev
      const result = parsePlannerDxf(prev.raw, prev.mapping, next)
      if (!result.preview) return prev
      return { ...prev, preview: result.preview, warnings: result.warnings }
    })
  }

  const onCommit = async (preview: ImportPreview) => {
    const session = useAuthStore.getState().session
    if (!session) {
      setStage({ kind: "error", message: t("import.dxf.create.failed") })
      return
    }

    setStage({ kind: "committing" })

    const { data, error } = await supabase
      .from("weddings")
      .insert({ owner_id: session.user.id, name: t("wedding"), date: null })
      .select("id")
      .single()

    if (error) {
      setStage({ kind: "error", message: t("import.dxf.create.failed") })
      return
    }

    const previousWeddingId = useGlobalStore.getState().weddingId
    useGlobalStore.setState({ weddingId: data.id })

    const ok = await replacePlannerLayout(
      preview.hall,
      preview.tables,
      preview.fixtures
    )
    if (!ok) {
      const { error: rollbackError } = await supabase
        .from("weddings")
        .delete()
        .eq("id", data.id)
      if (rollbackError) {
        console.error("[import-dxf] failed to rollback wedding", rollbackError)
      }
      useGlobalStore.setState({ weddingId: previousWeddingId })
      setStage({ kind: "error", message: t("import.dxf.create.failed") })
      return
    }

    onClose()
    await navigate({ to: "/wedding/$id/planner", params: { id: data.id } })
  }

  return (
    <Dialog
      open={dialog.opened === "Wedding.Import.Dxf"}
      onOpenChange={(open) => {
        if (!open && stage.kind !== "committing") onClose()
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogTitle>{t("import.dxf.create.title")}</DialogTitle>

        {stage.kind === "file" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("import.dxf.create.intro")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (file) void onFileChosen(file)
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              {t("import.dxf.choose_file")}
            </Button>
          </div>
        )}

        {stage.kind === "layers" && (
          <LayerMappingStep
            layers={stage.layers}
            initial={stage.mapping}
            onCancel={reset}
            onConfirm={(mapping) => onLayersConfirmed(mapping, stage.raw)}
          />
        )}

        {stage.kind === "preview" && (
          <PreviewStep
            preview={stage.preview}
            warnings={stage.warnings}
            unit={unit}
            onUnitChange={onUnitChange}
            onBack={reset}
            onCommit={() => onCommit(stage.preview)}
          />
        )}

        {stage.kind === "committing" && (
          <p className="text-sm text-muted-foreground">
            {t("import.dxf.create.committing")}
          </p>
        )}

        {stage.kind === "error" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">{stage.message}</p>
            <Button variant="outline" onClick={reset}>
              {t("import.dxf.try_again")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
