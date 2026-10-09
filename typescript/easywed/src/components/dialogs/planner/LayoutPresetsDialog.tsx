import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { LayoutPresetSaveSection } from "./LayoutPresetSaveSection"
import { LayoutPresetPickSection } from "./LayoutPresetPickSection"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"
import { useStaffTenant } from "@/hooks/useStaffTenant"
import { isLocalWedding } from "@/lib/localWedding"

/**
 * Venue layouts, from both sides, in one dialog: staff save the room on screen
 * as a preset, and a couple linked to a venue starts from one of its presets.
 *
 * Usually only one section renders. Both do for a staff member planning a
 * wedding linked to a venue - their own, in a demo - which is also the
 * quickest way to check a preset looks right from the couple's side.
 */
export const LayoutPresetsDialog = () => {
  const { t } = useTranslation()

  const dialog = useDialogStore(
    useShallow((state) => ({ opened: state.opened, close: state.close }))
  )
  const { weddingId, venue } = useGlobalStore(
    useShallow((state) => ({ weddingId: state.weddingId, venue: state.venue }))
  )
  const staffTenant = useStaffTenant()

  const canPick = !!weddingId && !isLocalWedding(weddingId) && !!venue

  return (
    <ResponsiveDialog
      open={dialog.opened === "Planner.LayoutPresets"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("layout_presets.title")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("layout_presets.summary_line")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col gap-6">
          {canPick && (
            <LayoutPresetPickSection
              weddingId={weddingId}
              venue={venue}
              onApplied={dialog.close}
            />
          )}
          {staffTenant && <LayoutPresetSaveSection tenantId={staffTenant.id} />}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
