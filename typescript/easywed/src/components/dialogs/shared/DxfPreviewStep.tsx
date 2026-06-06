import { useTranslation } from "react-i18next"
import type {
  DxfUnit,
  ImportPreview,
  ImportWarning,
} from "@/lib/import/plannerDxf"
import { warningKey } from "@/lib/import/plannerDxfWarningKey"
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

const UNITS: Array<DxfUnit> = ["mm", "cm", "m", "in", "ft"]

interface DxfPreviewStepProps {
  preview: ImportPreview
  warnings: Array<ImportWarning>
  unit: DxfUnit
  onUnitChange: (unit: DxfUnit) => void
  onBack: () => void
  onCommit: () => void
  commitLabelKey: string
  assignedGuests?: number
  showDestructiveWarning?: boolean
}

export const DxfPreviewStep = ({
  preview,
  warnings,
  unit,
  onUnitChange,
  onBack,
  onCommit,
  commitLabelKey,
  assignedGuests,
  showDestructiveWarning,
}: DxfPreviewStepProps) => {
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
          {assignedGuests && assignedGuests > 0 ? (
            <p className="text-amber-600">
              {t("import.dxf.warning.guests", { count: assignedGuests })}
            </p>
          ) : null}
        </FieldContent>
      </Field>

      {warnings.length > 0 && (
        <Field>
          <FieldLabel>{t("import.dxf.preview.warnings")}</FieldLabel>
          <FieldContent>
            <ul className="list-disc pl-4 text-xs text-muted-foreground">
              {warnings.map((w) => (
                <li key={w.code}>
                  {t(warningKey(w.code), { count: w.count ?? 0 })}
                </li>
              ))}
            </ul>
          </FieldContent>
        </Field>
      )}

      {showDestructiveWarning ? (
        <p className="text-xs text-amber-600">
          {t("import.dxf.preview.destructive")}
        </p>
      ) : null}

      <ButtonGroup className="justify-end">
        <Button variant="outline" onClick={onBack}>
          {t("import.dxf.back")}
        </Button>
        <Button onClick={onCommit}>{t(commitLabelKey)}</Button>
      </ButtonGroup>
    </div>
  )
}
