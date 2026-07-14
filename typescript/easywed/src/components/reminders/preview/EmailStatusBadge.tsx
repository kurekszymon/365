import { useTranslation } from "react-i18next"
import type { ReminderEmailStatus } from "@/stores/reminders.store"
import { Badge } from "@/components/ui/badge"

type Variant = "secondary" | "default" | "destructive" | "outline"

const config: Record<
  Exclude<ReminderEmailStatus, "none">,
  { variant: Variant; labelKey: string }
> = {
  scheduled: {
    variant: "secondary",
    labelKey: "reminders.email.status.scheduled",
  },
  sent: { variant: "default", labelKey: "reminders.email.status.sent" },
  failed: { variant: "destructive", labelKey: "reminders.email.status.failed" },
  canceled: { variant: "outline", labelKey: "reminders.email.status.canceled" },
}

export const EmailStatusBadge = ({
  status,
}: {
  status: ReminderEmailStatus
}) => {
  const { t } = useTranslation()
  if (status === "none") return null
  const c = config[status]
  return <Badge variant={c.variant}>{t(c.labelKey)}</Badge>
}
