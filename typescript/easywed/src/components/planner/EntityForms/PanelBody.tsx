import { HallPanelContent } from "./HallPanelContent"
import { HallsPanelContent } from "./HallsPanelContent"
import { TablePanelContent } from "./TablePanelContent"
import { TableBatchPanelContent } from "./TableBatchPanelContent"
import { FixturePanelContent } from "./FixturePanelContent"
import { AddHubContent } from "./AddHubContent"
import { AiChatPanelContent } from "./AiChatPanelContent"
import type { PanelView } from "@/stores/panel.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"

// Views that exist only to create something, plus the assistant (whose every
// tool mutates the planner). A viewer has no use for any of them, and they're
// exactly the views a disabled fieldset would reduce to a form that looks
// fillable but can never submit - so they don't render at all.
const WRITE_ONLY_VIEWS: ReadonlySet<PanelView["kind"]> = new Set([
  "tables.batch_add",
  "add_hub",
  "ai_chat",
])

/**
 * The inner content of a panel view, switched on its kind. Layout-agnostic so
 * it can render inside both the desktop `Sidebar/EntityEditDialog` and the
 * mobile bottom drawer (see `MobilePanelDrawer.tsx`).
 *
 * `fillHeight` opts the table form into the desktop dialog's fixed-height,
 * scroll-only-the-list layout; the mobile drawer leaves it off (natural flow).
 *
 * Every entity form funnels through here, so this is also where the read-only
 * planner is enforced for viewers (see selectCanEdit). The edit forms still
 * render - a viewer needs to read a table's capacity and dimensions - but sit
 * inside a disabled `fieldset`, which the platform propagates to every control
 * within, rather than threading a `disabled` prop through five forms and their
 * shared field components. `display: contents` keeps the fieldset out of the
 * layout so the existing flex/height rules are untouched.
 */
export const PanelBody = ({
  view,
  fillHeight = false,
}: {
  view: PanelView
  fillHeight?: boolean
}) => {
  const canEdit = useGlobalStore(selectCanEdit)

  if (!canEdit && WRITE_ONLY_VIEWS.has(view.kind)) return null

  return (
    <fieldset disabled={!canEdit} className="contents">
      {view.kind === "halls.list" && <HallsPanelContent />}
      {view.kind === "hall.edit" && (
        <HallPanelContent
          key={`hall.edit.${view.hallId}`}
          hallId={view.hallId}
        />
      )}
      {view.kind === "tables.batch_add" && (
        <TableBatchPanelContent
          key="tables.batch_add"
          position={view.position}
          hallId={view.hallId}
        />
      )}
      {view.kind === "table.edit" && (
        <TablePanelContent
          key={`table.edit.${view.tableId}`}
          tableId={view.tableId}
          fillHeight={fillHeight}
        />
      )}
      {view.kind === "fixture.edit" && (
        <FixturePanelContent
          key={`fixture.edit.${view.fixtureId}`}
          fixtureId={view.fixtureId}
        />
      )}
      {view.kind === "add_hub" && <AddHubContent />}
      {view.kind === "ai_chat" && <AiChatPanelContent />}
    </fieldset>
  )
}
