import { useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type {
  ImportPreview,
  ImportResult,
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
import { usePlannerStore } from "@/stores/planner.store"
import { parsePlannerDxf } from "@/lib/import/plannerDxf"
import { replacePlannerLayout } from "@/lib/sync/mutations"

type Stage =
  | { kind: "file" }
  | { kind: "layers"; result: ImportResult; raw: string }
  | { kind: "preview"; preview: ImportPreview; warnings: Array<ImportWarning> }
  | { kind: "committing" }
  | { kind: "error"; message: string }

const formatWarnings = (
  warnings: Array<ImportWarning>,
  t: (key: string, opts?: Record<string, unknown>) => string
): string =>
  warnings
    .map((w) => {
      // Pass `count` so i18next picks the right plural variant (en `_one`,
      // pl `_one`/`_few`/`_many`). Without it, plural-only keys render raw.
      const base = t(warningKey(w.code), { count: w.count ?? 0 })
      return w.detail ? `${base} (${w.detail})` : base
    })
    .join(" · ")

const ROLES: Array<LayerRole> = [
  "hall",
  "tables",
  "fixtures",
  "labels",
  "ignore",
]

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
    case "parse_error":
      return "import.dxf.warning.parse_error"
  }
}

export const ImportPlannerDxfDialog = () => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [stage, setStage] = useState<Stage>({ kind: "file" })

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
    }))
  )

  const guests = usePlannerStore((s) => s.guests)

  const reset = () => setStage({ kind: "file" })

  const onClose = () => {
    reset()
    dialog.close()
  }

  const onFileChosen = async (file: File) => {
    const text = await file.text()
    const result = parsePlannerDxf(text)
    // Auto-skip layer mapping when the file looks like an EasyWed export and
    // we already have a usable preview.
    if (result.preview && result.detectedAsEasywed) {
      setStage({
        kind: "preview",
        preview: result.preview,
        warnings: result.warnings,
      })
      return
    }
    // Otherwise drive the layer-mapping step — even if the initial parse came
    // back without a preview. `buildAutoMapping` defaults every non-EasyWed
    // layer to "ignore", so the hall isn't detected yet; the user picks roles
    // in step 2 and we re-parse.
    if (result.layers.length > 0) {
      setStage({ kind: "layers", result, raw: text })
      return
    }
    setStage({
      kind: "error",
      message: formatWarnings(result.warnings, t),
    })
  }

  const onLayersConfirmed = (mapping: LayerMapping, raw: string) => {
    const result = parsePlannerDxf(raw, mapping)
    if (!result.preview) {
      setStage({
        kind: "error",
        message: formatWarnings(result.warnings, t),
      })
      return
    }
    setStage({
      kind: "preview",
      preview: result.preview,
      warnings: result.warnings,
    })
  }

  const onCommit = async (preview: ImportPreview) => {
    setStage({ kind: "committing" })
    const ok = await replacePlannerLayout(
      preview.hall,
      preview.tables,
      preview.fixtures
    )
    if (!ok) {
      setStage({
        kind: "error",
        message: t("import.dxf.commit_failed"),
      })
      return
    }
    // Reflect the new layout in the local store immediately so the canvas
    // updates without waiting for a refetch. Guests whose tables were
    // removed get unassigned by the FK cascade server-side.
    usePlannerStore.setState((s) => ({
      hall: {
        dimensions: { width: preview.hall.width, height: preview.hall.height },
        preset: preview.hall.preset,
      },
      tables: preview.tables,
      fixtures: preview.fixtures,
      guests: s.guests.map((g) =>
        g.tableId && !preview.tables.some((tbl) => tbl.id === g.tableId)
          ? { ...g, tableId: null }
          : g
      ),
    }))
    onClose()
  }

  return (
    <Dialog
      open={dialog.opened === "Planner.Import.Dxf"}
      onOpenChange={(open) => {
        // Block close (overlay click / ESC / X) while the destructive commit
        // is in flight so we don't risk a state update on an unmounted
        // component and so the user isn't left wondering whether it landed.
        if (!open && stage.kind !== "committing") onClose()
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogTitle>{t("import.dxf.title")}</DialogTitle>

        {stage.kind === "file" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("import.dxf.intro")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                // Clear the input value so picking the same file again still
                // fires onChange — otherwise the "Try again" loop is flaky
                // after a parse error.
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
            layers={stage.result.layers}
            initial={stage.result.mapping}
            onCancel={reset}
            onConfirm={(mapping) => onLayersConfirmed(mapping, stage.raw)}
          />
        )}

        {stage.kind === "preview" && (
          <PreviewStep
            preview={stage.preview}
            warnings={stage.warnings}
            assignedGuests={guests.filter((g) => g.tableId).length}
            onBack={reset}
            onCommit={() => onCommit(stage.preview)}
          />
        )}

        {stage.kind === "committing" && (
          <p className="text-sm text-muted-foreground">
            {t("import.dxf.committing")}
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
  assignedGuests: number
  onBack: () => void
  onCommit: () => void
}

const PreviewStep = ({
  preview,
  warnings,
  assignedGuests,
  onBack,
  onCommit,
}: PreviewStepProps) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
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
          {assignedGuests > 0 && (
            <p className="text-amber-600">
              {t("import.dxf.warning.guests", { count: assignedGuests })}
            </p>
          )}
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

      <p className="text-xs text-amber-600">
        {t("import.dxf.preview.destructive")}
      </p>

      <ButtonGroup className="justify-end">
        <Button variant="outline" onClick={onBack}>
          {t("import.dxf.back")}
        </Button>
        <Button onClick={onCommit}>{t("import.dxf.commit")}</Button>
      </ButtonGroup>
    </div>
  )
}
