import { PanelBody } from "../PropertyPanel/PanelBody"
import { usePanelTitle } from "../PropertyPanel/usePanelTitle"
import type { PanelView } from "@/stores/panel.store"
import { usePanelStore } from "@/stores/panel.store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Only the "real form" views open as a desktop dialog. The rest of the
// `PanelView` union is either mobile-only (`add_hub` — the FAB bottom-drawer
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
 * header's "Konfiguruj salę" entry all keep working unchanged — only the
 * surface the form renders in differs per platform.
 */
export const EntityEditDialog = () => {
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
        className={wide ? "sm:max-w-3xl" : "sm:max-w-md"}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {dialogView && <PanelBody view={dialogView} />}
      </DialogContent>
    </Dialog>
  )
}
