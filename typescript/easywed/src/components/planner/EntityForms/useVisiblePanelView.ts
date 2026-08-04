import { useEffect } from "react"
import type { PanelView } from "@/stores/panel.store"
import { usePanelStore } from "@/stores/panel.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"

// Views that exist only to create something, plus the assistant (whose every
// tool mutates the planner). A viewer has no use for any of them, and they're
// exactly the views a disabled fieldset would reduce to a form that looks
// fillable but can never submit.
export const WRITE_ONLY_VIEWS: ReadonlySet<PanelView["kind"]> = new Set([
  "tables.batch_add",
  "add_hub",
  "ai_chat",
])

/**
 * The panel view to render, or null when the current role may not see it.
 *
 * Lives here rather than in `PanelBody` because the host - the mobile drawer or
 * the desktop dialog - decides whether to open at all from the raw `view`. With
 * only the body gated, a blocked view still opened the chrome around nothing: a
 * drawer with a title and a close button and no content.
 *
 * Clears the view rather than just declining to render it, for the same reason
 * DialogManager does: `panel.store` is a module-level singleton that nothing
 * resets between weddings, so leaving it set means the drawer springs open with
 * no user action behind it the moment canEdit flips true - a role that finished
 * loading, or a move back to a wedding you edit.
 */
export const useVisiblePanelView = (): PanelView | null => {
  const view = usePanelStore((state) => state.view)
  const close = usePanelStore((state) => state.close)
  const canEdit = useGlobalStore(selectCanEdit)

  const blocked = view !== null && !canEdit && WRITE_ONLY_VIEWS.has(view.kind)

  useEffect(() => {
    if (blocked) close()
  }, [blocked, close])

  return blocked ? null : view
}
