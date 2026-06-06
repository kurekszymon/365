import { useState } from "react"
import type {
  DxfUnit,
  ImportPreview,
  ImportWarning,
  LayerMapping,
} from "@/lib/import/plannerDxf"
import { parsePlannerDxf } from "@/lib/import/plannerDxf"
import { warningKey } from "@/lib/import/plannerDxfWarningKey"

type DxfImportStage =
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

type Translate = (key: string, opts?: Record<string, unknown>) => string

const formatWarnings = (warnings: Array<ImportWarning>, t: Translate): string =>
  warnings
    .map((w) => {
      const base = t(warningKey(w.code), { count: w.count ?? 0 })
      return w.detail ? `${base} (${w.detail})` : base
    })
    .join(" · ")

export const useDxfImportWizard = ({ t }: { t: Translate }) => {
  const [stage, setStage] = useState<DxfImportStage>({ kind: "file" })
  const [unit, setUnit] = useState<DxfUnit>("m")

  const reset = () => setStage({ kind: "file" })

  const setCommitting = () => setStage({ kind: "committing" })

  const setErrorMessage = (message: string) => {
    setStage({ kind: "error", message })
  }

  const setParseError = (warnings: Array<ImportWarning>) => {
    setErrorMessage(formatWarnings(warnings, t))
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

    setParseError(result.warnings)
  }

  const onLayersConfirmed = (mapping: LayerMapping, raw: string) => {
    const result = parsePlannerDxf(raw, mapping, unit)
    if (!result.preview) {
      setParseError(result.warnings)
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

  return {
    stage,
    unit,
    reset,
    setCommitting,
    setErrorMessage,
    onFileChosen,
    onLayersConfirmed,
    onUnitChange,
  }
}
