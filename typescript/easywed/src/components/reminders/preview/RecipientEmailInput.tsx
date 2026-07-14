import { useId } from "react"
import { useTranslation } from "react-i18next"
import type { MemberEmail } from "./useWeddingMemberEmails"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// Email input for a reminder's recipient, with wedding-member addresses offered
// as native `<datalist>` hints. Leaving it empty keeps the reminder a plain
// todo (no email is scheduled or sent).
export const RecipientEmailInput = ({
  value,
  onChange,
  members,
}: {
  value: string
  onChange: (value: string) => void
  members: Array<MemberEmail>
}) => {
  const { t } = useTranslation()
  const listId = useId()

  return (
    <Field>
      <FieldLabel htmlFor="reminder-recipient">
        {t("reminders.recipient.label")}
      </FieldLabel>
      <Input
        id="reminder-recipient"
        type="email"
        list={members.length > 0 ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("reminders.recipient.placeholder")}
      />
      {members.length > 0 ? (
        <datalist id={listId}>
          {members.map((m) => (
            <option key={m.userId} value={m.email} />
          ))}
        </datalist>
      ) : null}
      <FieldDescription>{t("reminders.recipient.hint")}</FieldDescription>
    </Field>
  )
}
