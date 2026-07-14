import { useTranslation } from "react-i18next"
import { RecipientEmailInput } from "./RecipientEmailInput"
import type { MemberEmail } from "./useWeddingMemberEmails"
import { Field, FieldGroup } from "@/components/ui/field"
import { DatePicker } from "@/components/ui/datepicker"
import { Textarea } from "@/components/ui/textarea"

// The shared body of the create/edit reminder forms: content, recipient email
// (with member hints), and a due date. Fully controlled by the parent popover.
export const ReminderFormFields = ({
  text,
  onTextChange,
  due,
  onDueChange,
  recipient,
  onRecipientChange,
  members,
}: {
  text: string
  onTextChange: (value: string) => void
  due?: Date
  onDueChange: (value?: Date) => void
  recipient: string
  onRecipientChange: (value: string) => void
  members: Array<MemberEmail>
}) => {
  const { t } = useTranslation()

  return (
    <FieldGroup className="gap-4">
      <Field orientation="horizontal">
        <Textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t("reminders.create.content_placeholder")}
        />
      </Field>
      <RecipientEmailInput
        value={recipient}
        onChange={onRecipientChange}
        members={members}
      />
      <DatePicker
        setDate={onDueChange}
        date={due}
        placeholderTlKey="reminders.create.date_prompt"
      />
    </FieldGroup>
  )
}
