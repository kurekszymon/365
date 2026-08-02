import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { WeddingSummary } from "./WeddingListItem"
import { deleteWedding, leaveWedding } from "@/lib/sync/weddings"
import { useAuthStore } from "@/stores/auth.store"
import { matchesConfirmWord } from "@/lib/confirmWord"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { ConfirmWordField } from "@/components/dialogs/shared/ConfirmWordField"
import { Button } from "@/components/ui/button"

export type RemoveMode = "delete" | "leave"

interface RemoveWeddingDialogProps {
  // The target outlives `open` on purpose: the caller keeps it set while the
  // dialog animates out, so the copy doesn't flip to the other mode's wording
  // on the way. See routes/home.tsx, which also keys this component by target
  // so each new one gets a fresh confirmation field.
  open: boolean
  wedding: WeddingSummary
  mode: RemoveMode
  onOpenChange: (open: boolean) => void
  onDone: (weddingId: string) => void
}

export const RemoveWeddingDialog = ({
  open,
  wedding,
  mode,
  onOpenChange,
  onDone,
}: RemoveWeddingDialogProps) => {
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.session?.user.id)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState("")

  const handleConfirm = async () => {
    if (!userId) return

    setSubmitting(true)
    const { error } =
      mode === "delete"
        ? await deleteWedding(wedding.id)
        : await leaveWedding(wedding.id, userId)
    setSubmitting(false)

    if (error) {
      toast.error(t(`weddings.${mode}_failed`))
      return
    }

    toast.success(t(`weddings.${mode}_done`))
    onDone(wedding.id)
    onOpenChange(false)
  }

  const name = wedding.name || t("wedding")
  // Deleting takes the hall, tables and the whole guest list away from every
  // member, with no way back - same weight as deleting an account, so it gets
  // the same gate. Leaving only drops your own access and an owner can invite
  // you straight back, so it stays one click.
  const needsConfirmWord = mode === "delete"
  const confirmWord = t("common.confirm_word")
  const canConfirm =
    !submitting &&
    (!needsConfirmWord || matchesConfirmWord(confirmation, confirmWord))

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        // Clear the typed word on the way out. home.tsx keys this component by
        // wedding+mode, which gives a fresh instance for a *different* target
        // but reuses this one when the same wedding is reopened - so without
        // this, cancelling a delete and opening it again would find the
        // destructive button already armed by the word you typed last time.
        //
        // `submitting` is deliberately not reset: it clears itself when the
        // request settles, and forcing it false here would re-enable the
        // button for a leave that is still in flight.
        if (!next) setConfirmation("")
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t(`weddings.${mode}_title`, { name })}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(`weddings.${mode}_body`)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Stays mounted when leaving, so both variants keep the same shape;
            everything that flow needs to say fits in the description above. */}
        <ResponsiveDialogBody>
          {needsConfirmWord && (
            <ConfirmWordField
              id="remove-wedding-confirmation"
              word={confirmWord}
              value={confirmation}
              onChange={setConfirmation}
            />
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline">{t("common.cancel")}</Button>
          </ResponsiveDialogClose>
          <Button
            variant="destructive"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
          >
            {t(`weddings.${mode}_confirm`)}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
