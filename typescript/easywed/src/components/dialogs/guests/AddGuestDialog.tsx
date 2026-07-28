import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { GuestFormFields } from "./GuestFormFields"
import type { GuestFormValues } from "./GuestFormFields"
import { usePlannerStore } from "@/stores/planner.store"
import { useEntityListStore } from "@/stores/entityList.store"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { ADULT_AGE_GROUP } from "@/lib/ageGroup"

const EMPTY_GUEST: GuestFormValues = {
  name: "",
  dietary: [],
  ageGroup: ADULT_AGE_GROUP,
  note: "",
}

export const AddGuestDialog = () => {
  const { t } = useTranslation()
  const [form, setForm] = useState<GuestFormValues>(EMPTY_GUEST)

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
  const openGuestList = useEntityListStore((state) => state.openTab)

  return (
    <ResponsiveDialog
      open={dialog.opened === "Guest.Add"}
      onOpenChange={(open) => {
        if (!open) {
          dialog.close()
          setForm(EMPTY_GUEST)
        }
      }}
    >
      <ResponsiveDialogContent
        className="sm:max-w-sm"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("guests.add")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <GuestFormFields value={form} onChange={setForm} />
          <Button
            disabled={!form.name.trim()}
            onClick={() => {
              planner.addGuest({
                name: form.name.trim(),
                note: form.note.trim(),
                tableId: null,
                dietary: form.dietary,
                ageGroup: form.ageGroup,
              })
              // Reveal the new guest in the entity-list panel - the desktop
              // rail and the mobile drawer share the store, so one call covers
              // whichever surface this platform renders.
              openGuestList("guests")
              dialog.close()
              setForm(EMPTY_GUEST)
            }}
          >
            {t("common.save")}
          </Button>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
