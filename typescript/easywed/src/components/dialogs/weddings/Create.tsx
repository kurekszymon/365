import { useShallow } from "zustand/react/shallow"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { useDialogStore } from "@/stores/dialog"
import { useGlobalStore } from "@/stores/global"
import { DatePicker } from "@/components/ui/datepicker"
import { Field, FieldLabel } from "@/components/ui/field"

export const WeddingCreateDialog = () => {
  const { t } = useTranslation()
  const { name, setName, date, setDate } = useGlobalStore(
    useShallow((state) => ({
      name: state.name,
      date: state.date,
      setName: state.setName,
      setDate: state.setDate,
    }))
  )

  const [localName, setLocalName] = useState(name)
  const [localDate, setLocalDate] = useState(date)

  const dialog = useDialogStore(
    useShallow((state) => ({
      open: state.open,
      close: state.close,
      opened: state.opened,
    }))
  )

  const handleClose = () => {
    dialog.close()

    if (name) {
      setLocalName(name)
      setLocalDate(date)
      return
    }

    setName(t("wedding.defaults.name"))
    setLocalName(t("wedding.defaults.name"))
  }

  const handleSave = () => {
    dialog.close()
    setName(localName)
    setDate(localDate)
  }

  return (
    <Dialog
      open={dialog.opened === "Wedding.Create"}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      {/* aria-describedby={undefined} to suppres radix warnings */}
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("wedding.create.title")}</DialogTitle>
        </DialogHeader>
        <Field className={`mx-auto w-44 w-full`}>
          <FieldLabel htmlFor="wedding-name-input">
            {t("common.name")}
          </FieldLabel>
          <Input
            id="wedding-name-input"
            placeholder={t("wedding.create.title_placeholder")}
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            autoFocus
            required
          />
        </Field>
        <DatePicker
          date={localDate}
          setDate={setLocalDate}
          info={t("wedding.create.date_info")}
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!localName?.trim() || localName === name}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
