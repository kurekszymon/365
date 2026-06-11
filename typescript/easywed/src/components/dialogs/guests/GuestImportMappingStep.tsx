import { useTranslation } from "react-i18next"
import type { ColumnMapping, GuestImportField } from "@/lib/import/guestsImport"
import { GUEST_IMPORT_FIELDS } from "@/lib/import/guestsImport"
import { GuestImportSheetPreview } from "@/components/dialogs/guests/GuestImportSheetPreview"
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

const NONE = "none"

const colToValue = (col: number | null): string =>
  col === null ? NONE : String(col)

interface IProps {
  headers: Array<string>
  rows: Array<Array<string>>
  mapping: ColumnMapping
  onSetMapping: (field: GuestImportField, col: number | null) => void
  onBack: () => void
  onNext: () => void
}

// Lets the user match each guest field to a column from the uploaded file.
// `name` is required; the rest are optional. A live preview of the raw sheet
// sits below so they can see what each column holds while mapping.
export const GuestImportMappingStep = ({
  headers,
  rows,
  mapping,
  onSetMapping,
  onBack,
  onNext,
}: IProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t("guests.import.map_columns")}
      </p>
      <div className="flex flex-col gap-2">
        {GUEST_IMPORT_FIELDS.map((field) => (
          <Field key={field} className="flex-row items-center gap-3">
            <FieldLabel className="flex-1">
              {t(`guests.import.col.${field}`)}
              {field === "name" && <span className="text-destructive"> *</span>}
            </FieldLabel>
            <FieldContent className="flex-1">
              <Select
                value={colToValue(mapping[field])}
                onValueChange={(v) =>
                  onSetMapping(field, v === NONE ? null : Number(v))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    {t("guests.import.col_none")}
                  </SelectItem>
                  {headers.map((header, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {header || t("guests.import.col_unnamed", { i: i + 1 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        ))}
      </div>
      <GuestImportSheetPreview headers={headers} rows={rows} />
      <ButtonGroup className="justify-end">
        <Button variant="outline" onClick={onBack}>
          {t("guests.import.back")}
        </Button>
        <Button disabled={mapping.name === null} onClick={onNext}>
          {t("guests.import.next")}
        </Button>
      </ButtonGroup>
    </div>
  )
}
