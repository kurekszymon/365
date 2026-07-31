import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { WeddingSummary } from "./WeddingListItem"
import { deleteWedding, leaveWedding } from "@/lib/sync/weddings"
import { useAuthStore } from "@/stores/auth.store"
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
import { Button } from "@/components/ui/button"

export type RemoveMode = "delete" | "leave"

interface RemoveWeddingDialogProps {
  wedding: WeddingSummary | null
  mode: RemoveMode
  onOpenChange: (open: boolean) => void
  onDone: (weddingId: string) => void
}

export const RemoveWeddingDialog = ({
  wedding,
  mode,
  onOpenChange,
  onDone,
}: RemoveWeddingDialogProps) => {
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.session?.user.id)
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!wedding || !userId) return

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

  const name = wedding?.name || t("wedding")

  return (
    <ResponsiveDialog open={wedding !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t(`weddings.${mode}_title`, { name })}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(`weddings.${mode}_body`)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* The body slot stays mounted so both variants keep the same shape;
            everything they need to say fits in the description above. */}
        <ResponsiveDialogBody />

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline">{t("common.cancel")}</Button>
          </ResponsiveDialogClose>
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={() => void handleConfirm()}
          >
            {t(`weddings.${mode}_confirm`)}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
