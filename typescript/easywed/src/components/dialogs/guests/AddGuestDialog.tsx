import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { Dietary } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"

const DIETARY_OPTIONS: Array<Dietary> = [
  "gluten-free",
  "halal",
  "kosher",
  "vegan",
]

export const AddGuestDialog = () => {
  const { t } = useTranslation()
  const [dietaryOptions, setDietaryOptions] = useState<Array<Dietary>>([])
  const [note, setNote] = useState("")
  const [name, setName] = useState("")

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
      open: state.open,
    }))
  )
  const planner = usePlannerStore(
    useShallow((state) => ({
      addGuest: state.addGuest,
    }))
  )

  return (
    <Dialog
      open={dialog.opened === "Guest.Add"}
      onOpenChange={(open) => {
        if (!open) {
          dialog.close()
        }
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>{t("guests.add")}</DialogTitle>
        <Field>
          <FieldLabel>{t("guests.add.name")}</FieldLabel>
          <FieldContent>
            <Input
              placeholder={t("guests.add.name_placeholder")}
              type="text"
              className="w-full rounded-md border"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>{t("guests.add.dietary_preferences")}</FieldLabel>
          <FieldContent className="flex-row gap-1.5">
            {DIETARY_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={
                  dietaryOptions.includes(option) ? "default" : "outline"
                }
                className="rounded-full"
                onClick={() => {
                  if (dietaryOptions.includes(option)) {
                    setDietaryOptions(
                      dietaryOptions.filter((o) => o !== option)
                    )
                  } else {
                    setDietaryOptions([...dietaryOptions, option])
                  }
                }}
              >
                {option}
              </Button>
            ))}
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>{t("guests.add.note")}</FieldLabel>
          <FieldContent>
            <Input
              placeholder={t("guests.add.note_placeholder")}
              type="text"
              className="w-full rounded-md border"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FieldContent>
        </Field>
        <Button
          disabled={!name.trim()}
          onClick={() => {
            planner.addGuest({
              name: name.trim(),
              note: note.trim(),
              tableId: null,
              dietary: dietaryOptions,
            })
            dialog.close()
          }}
        >
          {t("common.save")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
