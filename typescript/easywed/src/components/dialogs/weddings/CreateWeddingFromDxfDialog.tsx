import { useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type {
  DxfUnit,
  ImportPreview,
  ImportWarning,
  LayerMapping,
  LayerRole,
} from "@/lib/import/plannerDxf"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDialogStore } from "@/stores/dialog.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { parsePlannerDxf } from "@/lib/import/plannerDxf"
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

const ROLES: Array<LayerRole> = [
  "hall",
  "tables",
  "fixtures",
  "labels",
  "ignore",
]

const UNITS: Array<DxfUnit> = ["mm", "cm", "m", "in", "ft"]

const warningKey = (code: ImportWarning["code"]): string => {
  switch (code) {
    case "skipped_arc":
      return "import.dxf.warning.skipped_arc"
    case "skipped_spline":
      return "import.dxf.warning.skipped_spline"
    case "skipped_polyline_open":
      return "import.dxf.warning.skipped_open"
    case "skipped_unknown":
      return "import.dxf.warning.skipped_unknown"
    case "no_hall":
      return "import.dxf.warning.no_hall"
    case "hall_synthesized":
      return "import.dxf.warning.hall_synthesized"
    case "ambiguous_layer":
      return "import.dxf.warning.ambiguous_layer"
    case "unit_assumed":
      return "import.dxf.warning.unit_assumed"
    case "parse_error":
      return "import.dxf.warning.parse_error"
  }
}

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
    setStage({ kind: "committing" })

    const session = useAuthStore.getState().session
    if (!session) return

    const { data, error } = await supabase
      .from("weddings")
      .insert({ owner_id: session.user.id, name: t("wedding"), date: null })
      .select("id")
      .single()

    if (error) {
      setStage({ kind: "error", message: t("import.dxf.create.failed") })
      return
    }

    useGlobalStore.setState({ weddingId: data.id })

    const ok = await replacePlannerLayout(
      preview.hall,
      preview.tables,
      preview.fixtures
    )
    if (!ok) {
      setStage({ kind: "error", message: t("import.dxf.commit_failed") })
      return
    }

    onClose()
    void navigate({ to: "/wedding/$id/planner", params: { id: data.id } })
  }

  return (
    <Dialog
      open={dialog.opened === "Wedding.ImportDxf"}
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

interface LayerMappingStepProps {
  layers: Array<string>
  initial: LayerMapping
  onCancel: () => void
  onConfirm: (mapping: LayerMapping) => void
}

const LayerMappingStep = ({
  layers,
  initial,
  onCancel,
  onConfirm,
}: LayerMappingStepProps) => {
  const { t } = useTranslation()
  const [mapping, setMapping] = useState<LayerMapping>(initial)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t("import.dxf.step.layers_intro")}
      </p>
      <div className="flex flex-col gap-2">
        {layers.map((layer) => (
          <Field key={layer} className="flex-row items-center gap-3">
            <FieldLabel className="flex-1 truncate font-mono text-xs">
              {layer || t("import.dxf.layer.default")}
            </FieldLabel>
            <FieldContent className="flex-1">
              <Select
                value={mapping[layer] ?? "ignore"}
                onValueChange={(v) =>
                  setMapping((m) => ({ ...m, [layer]: v as LayerRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`import.dxf.layer.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        ))}
      </div>
      <ButtonGroup className="justify-end">
        <Button variant="outline" onClick={onCancel}>
          {t("import.dxf.back")}
        </Button>
        <Button onClick={() => onConfirm(mapping)}>
          {t("import.dxf.next")}
        </Button>
      </ButtonGroup>
    </div>
  )
}

interface PreviewStepProps {
  preview: ImportPreview
  warnings: Array<ImportWarning>
  unit: DxfUnit
  onUnitChange: (unit: DxfUnit) => void
  onBack: () => void
  onCommit: () => void
}

const PreviewStep = ({
  preview,
  warnings,
  unit,
  onUnitChange,
  onBack,
  onCommit,
}: PreviewStepProps) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <Field className="flex-row items-center gap-3">
        <FieldLabel className="flex-1">{t("import.dxf.unit.label")}</FieldLabel>
        <FieldContent className="flex-1">
          <Select
            value={unit}
            onValueChange={(v) => onUnitChange(v as DxfUnit)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {t(`import.dxf.unit.${u}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{t("import.dxf.preview.summary")}</FieldLabel>
        <FieldContent className="text-sm">
          <p>
            {t("import.dxf.preview.hall", {
              width: preview.hall.width.toFixed(2),
              height: preview.hall.height.toFixed(2),
            })}
          </p>
          <p>
            {t("import.dxf.preview.counts", {
              tables: preview.tables.length,
              fixtures: preview.fixtures.length,
            })}
          </p>
        </FieldContent>
      </Field>

      {warnings.length > 0 && (
        <Field>
          <FieldLabel>{t("import.dxf.preview.warnings")}</FieldLabel>
          <FieldContent>
            <ul className="list-disc pl-4 text-xs text-muted-foreground">
              {warnings.map((w, i) => (
                <li key={i}>
                  {t(warningKey(w.code), { count: w.count ?? 0 })}
                </li>
              ))}
            </ul>
          </FieldContent>
        </Field>
      )}

      <ButtonGroup className="justify-end">
        <Button variant="outline" onClick={onBack}>
          {t("import.dxf.back")}
        </Button>
        <Button onClick={onCommit}>{t("import.dxf.create.commit")}</Button>
      </ButtonGroup>
    </div>
  )
}
