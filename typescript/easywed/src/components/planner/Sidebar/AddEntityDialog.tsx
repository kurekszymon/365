import { useTranslation } from "react-i18next"
import { AddHubContent } from "../PropertyPanel/AddHubContent"
import type { AddHubCategory } from "../PropertyPanel/AddHubContent"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCategory: AddHubCategory
}

/**
 * Desktop-only "Dodaj do sali" preset picker, opened from the sidebar's
 * Tables/Fixtures list panels pre-filtered to the launching category. A plain
 * `Dialog` (not `ResponsiveDialog`) because mobile reaches the same
 * `AddHubContent` through the `add_hub` panel view / bottom drawer instead.
 * Inserting a preset routes to its edit view (picked up by
 * `EntityEditDialog`), so `onInserted` closes this dialog out of the way.
 */
export const AddEntityDialog = ({
  open,
  onOpenChange,
  initialCategory,
}: Props) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("hall.add_hub.title")}</DialogTitle>
        </DialogHeader>
        <AddHubContent
          initialCategory={initialCategory}
          onInserted={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
