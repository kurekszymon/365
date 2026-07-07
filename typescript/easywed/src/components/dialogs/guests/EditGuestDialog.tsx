import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { GuestFormFields } from "./GuestFormFields"
import type { GuestFormValues } from "./GuestFormFields"
import { usePlannerStore } from "@/stores/planner.store"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"

export const EditGuestDialog = () => {
  const { t } = useTranslation()

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      guestId: state.payload.guestId,
      close: state.close,
    }))
  )
  const { guests, updateGuest } = usePlannerStore(
    useShallow((state) => ({
      guests: state.guests,
      updateGuest: state.updateGuest,
    }))
  )

  const guest = guests.find((g) => g.id === dialog.guestId) ?? null

  const [form, setForm] = useState<GuestFormValues>({
    name: "",
    dietary: [],
    note: "",
  })
  // Reload the form whenever the dialog targets a different guest (React's
  // documented "reset state when a prop changes" pattern) so it's populated
  // before the first paint rather than via an effect.
  const [prevGuestId, setPrevGuestId] = useState<string | null>(null)
  if (guest && guest.id !== prevGuestId) {
    setPrevGuestId(guest.id)
    setForm({
      name: guest.name,
      dietary: guest.dietary,
      note: guest.note ?? "",
    })
  }

  return (
    <ResponsiveDialog
      open={dialog.opened === "Guest.Edit" && guest != null}
      onOpenChange={(open) => {
        if (!open) {
          dialog.close()
          setPrevGuestId(null)
        }
      }}
    >
      <ResponsiveDialogContent
        className="sm:max-w-sm"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("guests.edit")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <GuestFormFields value={form} onChange={setForm} />
          <Button
            disabled={!form.name.trim()}
            onClick={() => {
              if (!guest) return
              updateGuest(guest.id, {
                name: form.name.trim(),
                note: form.note.trim(),
                dietary: form.dietary,
              })
              dialog.close()
              setPrevGuestId(null)
            }}
          >
            {t("common.save")}
          </Button>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
