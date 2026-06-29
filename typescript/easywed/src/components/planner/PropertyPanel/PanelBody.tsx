import { useTranslation } from "react-i18next"
import { HallPanelContent } from "./HallPanelContent"
import { TablePanelContent } from "./TablePanelContent"
import { TableBatchPanelContent } from "./TableBatchPanelContent"
import { GuestsPanelContent } from "./GuestsPanelContent"
import { FixturePanelContent } from "./FixturePanelContent"
import { AiChatPanelContent } from "./AiChatPanelContent"
import type { PanelView } from "@/stores/panel.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"

/**
 * The inner content of the property panel, switched on the current panel view.
 * Layout-agnostic so it can render inside both the desktop sidebar and the
 * mobile bottom drawer (see `PropertyPanel/index.tsx`).
 */
export const PanelBody = ({ view }: { view: PanelView }) => {
  const { t } = useTranslation()
  const openTableAdd = usePanelStore((state) => state.openTableAdd)
  const openTablesBatchAdd = usePanelStore((state) => state.openTablesBatchAdd)
  const openFixtureAdd = usePanelStore((state) => state.openFixtureAdd)

  return (
    <>
      {view.kind === "hall" && <HallPanelContent />}
      {view.kind === "table.add" && (
        <TablePanelContent
          key="table.add"
          mode="add"
          position={view.position}
        />
      )}
      {view.kind === "tables.batch_add" && (
        <TableBatchPanelContent
          key="tables.batch_add"
          position={view.position}
        />
      )}
      {view.kind === "table.edit" && (
        <TablePanelContent
          key={`table.edit.${view.tableId}`}
          mode="edit"
          tableId={view.tableId}
        />
      )}
      {view.kind === "tables.placeholder" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {t("tables.select_to_edit")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => openTableAdd()}>
              {t("tables.add")}
            </Button>
            <Button variant="outline" onClick={() => openTablesBatchAdd()}>
              {t("tables.add_batch")}
            </Button>
          </div>
        </div>
      )}
      {view.kind === "guests" && <GuestsPanelContent />}
      {view.kind === "fixture.add" && (
        <FixturePanelContent
          key="fixture.add"
          mode="add"
          position={view.position}
        />
      )}
      {view.kind === "fixture.edit" && (
        <FixturePanelContent
          key={`fixture.edit.${view.fixtureId}`}
          mode="edit"
          fixtureId={view.fixtureId}
        />
      )}
      {view.kind === "fixtures.placeholder" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {t("fixtures.select_to_edit")}
          </p>
          <Button variant="outline" onClick={() => openFixtureAdd()}>
            {t("fixtures.add")}
          </Button>
        </div>
      )}
      {view.kind === "ai_chat" && <AiChatPanelContent />}
    </>
  )
}
