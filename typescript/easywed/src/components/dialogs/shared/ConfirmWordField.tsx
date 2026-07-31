import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConfirmWordFieldProps {
  id: string
  word: string
  value: string
  onChange: (value: string) => void
}

/**
 * The "type DELETE to confirm" gate, shared by the two actions that destroy
 * data nobody can get back: deleting an account and deleting a wedding. Both
 * take something away from other people as well as the person clicking, which
 * is what earns the extra friction - leaving a wedding stays one click,
 * because an owner can invite you straight back.
 */
export const ConfirmWordField = ({
  id,
  word,
  value,
  onChange,
}: ConfirmWordFieldProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t("common.confirm_label", { word })}</Label>
      <Input
        id={id}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
