import { useTranslation } from "react-i18next"
import { CheckIcon } from "lucide-react"
import { PanelBody } from "../EntityForms/PanelBody"
import { usePanelTitle } from "../EntityForms/usePanelTitle"
import type { PanelView } from "@/stores/panel.store"
import { usePanelStore } from "@/stores/panel.store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Only the "real form" views open as a desktop dialog. The rest of the
// `PanelView` union is either mobile-only (`add_hub` - the FAB bottom-drawer
// flow) or owned by the sidebar rail on desktop (`ai_chat`), so this dialog
// treats them as closed.
const DIALOG_KINDS: ReadonlySet<PanelView["kind"]> = new Set([
  "hall",
  "table.edit",
  "tables.batch_add",
  "fixture.edit",
])

/**
 * Desktop replacement for the old right-hand PropertyPanel column: watches
 * `panel.store` and renders the current table/fixture/hall form in a modal
 * dialog. Canvas selection, `openTableEdit`/`openFixtureEdit` callers and the
 * header's "Konfiguruj salę" entry all keep working unchanged - only the
 * surface the form renders in differs per platform.
 */
export const EntityEditDialog = () => {
  const { t } = useTranslation()
  const view = usePanelStore((state) => state.view)
  const close = usePanelStore((state) => state.close)

  const dialogView = view && DIALOG_KINDS.has(view.kind) ? view : null
  const title = usePanelTitle(dialogView)

  // The table form is the tall one (config + guest picker + a row per seat);
  // give it a wider dialog so it can lay those out in two columns instead of
  // one very long scroll. The rest stay compact.
  const wide = dialogView?.kind === "table.edit"

  return (
    <Dialog
      open={dialogView !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        // The table form gets a fixed-height, non-scrolling shell: the form
        // fills it and scrolls only its own seat list (see TablePanelContent),
        // so the table preview can center in the left column's leftover space.
        // Other views stay compact and scroll as a whole.
        className={
          wide
            ? "flex h-[80vh] flex-col overflow-hidden sm:max-w-3xl"
            : "sm:max-w-md"
        }
      >
        {/* Every view this dialog hosts (hall/table/fixture/batch) applies its
            edits live, so dismissing it is a "done" confirmation. Mirror the
            mobile drawer's checkmark affordance instead of the neutral X. */}
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <button
            type="button"
            onClick={close}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label={t("common.done")}
          >
            <CheckIcon className="size-5" />
          </button>
        </DialogHeader>
        {dialogView &&
          (wide ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <PanelBody view={dialogView} fillHeight />
            </div>
          ) : (
            <PanelBody view={dialogView} />
          ))}
      </DialogContent>
    </Dialog>
  )
}
