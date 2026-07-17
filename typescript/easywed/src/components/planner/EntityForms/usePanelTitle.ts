import { useTranslation } from "react-i18next"
import type { PanelView } from "@/stores/panel.store"

/**
 * Human title for a panel view - shared by the mobile bottom drawer
 * (`MobilePanelDrawer`) and the desktop `Sidebar/EntityEditDialog` so
 * the two surfaces can't drift apart.
 */
export function usePanelTitle(view: PanelView | null): string {
  const { t } = useTranslation()
  if (!view) return ""
  switch (view.kind) {
    case "halls.list":
      return t("hall.list_title")
    case "hall.edit":
      return t("hall")
    case "tables.batch_add":
      return t("tables.add_batch")
    case "table.edit":
      return t("tables.edit")
    case "fixture.edit":
      return t("fixtures.edit")
    case "add_hub":
      return t("hall.add_hub.title")
    case "ai_chat":
      return t("assistant.title")
  }
}
