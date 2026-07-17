import { useTranslation } from "react-i18next"
import type { GuestSort } from "@/lib/export/guests"
import { GUEST_SORTS } from "@/lib/export/guests"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"

interface IProps {
  sort: GuestSort
  onChange: (sort: GuestSort) => void
}

// Pill selector for guest ordering (alphabetical vs. by seat) - shared by the
// CSV and PDF export dialogs so the two flows can't drift apart.
export const GuestSortField = ({ sort, onChange }: IProps) => {
  const { t } = useTranslation()

  return (
    <Field>
      <FieldLabel>{t("export.sort")}</FieldLabel>
      <FieldContent className="flex-row flex-wrap gap-1.5">
        {GUEST_SORTS.map((mode) => (
          <Button
            key={mode}
            variant={sort === mode ? "default" : "outline"}
            className="rounded-full"
            onClick={() => onChange(mode)}
          >
            {t(`export.sort.${mode}`)}
          </Button>
        ))}
      </FieldContent>
    </Field>
  )
}
