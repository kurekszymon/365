import { UploadIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDialogStore } from "@/stores/dialog.store"

// Guest-list import is the only import flow, so this is a plain button
// rather than a dropdown of formats.
export const ImportHeader = () => {
  const { t } = useTranslation()
  const open = useDialogStore((s) => s.open)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          aria-label={t("import")}
          onClick={() => open("Guest.Import")}
        >
          <UploadIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("import")}</TooltipContent>
    </Tooltip>
  )
}
