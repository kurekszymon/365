import { useState } from "react"
import { useTranslation } from "react-i18next"
import { DeleteAccountDialog } from "./DeleteAccountDialog"
import { Button } from "@/components/ui/button"

export const DeleteAccountSection = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{t("settings.delete.title")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("settings.delete.summary")}
        </p>
      </div>

      <Button
        variant="destructive"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {t("settings.delete.title")}
      </Button>

      <DeleteAccountDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
