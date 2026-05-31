import { UploadIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDialogStore } from "@/stores/dialog.store"

export const ImportHeader = () => {
  const { t } = useTranslation()
  const open = useDialogStore((s) => s.open)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          onClick={() => open("Planner.Import.Dxf")}
          aria-label={t("import.dxf.title")}
        >
          <UploadIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("import.dxf.title")}</TooltipContent>
    </Tooltip>
  )
}
