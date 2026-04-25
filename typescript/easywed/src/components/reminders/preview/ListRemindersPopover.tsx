import { ExternalLinkIcon, ListIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "@tanstack/react-router"
import { ReminderList } from "./ReminderListPreview"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Route } from "@/routes/wedding.$id"

export const ListRemindersPopover = () => {
  const { id } = Route.useParams()

  const { t } = useTranslation()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <ListIcon />
          <span className="hidden md:inline">{t("reminders.title")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <ReminderList />
        <Button variant={"link"}>
          <Link to="/wedding/$id/reminders" params={{ id }}>
            {t("reminders.navigate")}
          </Link>
          <ExternalLinkIcon />
        </Button>
      </PopoverContent>
    </Popover>
  )
}
