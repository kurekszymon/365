import { HallPanelContent } from "./HallPanelContent"
import { HallsPanelContent } from "./HallsPanelContent"
import { TablePanelContent } from "./TablePanelContent"
import { TableBatchPanelContent } from "./TableBatchPanelContent"
import { FixturePanelContent } from "./FixturePanelContent"
import { AddHubContent } from "./AddHubContent"
import { AiChatPanelContent } from "./AiChatPanelContent"
import type { PanelView } from "@/stores/panel.store"

/**
 * The inner content of a panel view, switched on its kind. Layout-agnostic so
 * it can render inside both the desktop `Sidebar/EntityEditDialog` and the
 * mobile bottom drawer (see `MobilePanelDrawer.tsx`).
 *
 * `fillHeight` opts the table form into the desktop dialog's fixed-height,
 * scroll-only-the-list layout; the mobile drawer leaves it off (natural flow).
 */
export const PanelBody = ({
  view,
  fillHeight = false,
}: {
  view: PanelView
  fillHeight?: boolean
}) => (
  <>
    {view.kind === "halls.list" && <HallsPanelContent />}
    {view.kind === "hall.edit" && (
      <HallPanelContent key={`hall.edit.${view.hallId}`} hallId={view.hallId} />
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
  </>
)
