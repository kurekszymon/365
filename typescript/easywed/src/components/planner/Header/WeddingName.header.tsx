import { useTranslation } from "react-i18next"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import { InlineEdit } from "@/components/ui/inline-edit"

export const WeddingName = () => {
  const { t } = useTranslation()
  const name = useGlobalStore((state) => state.name)
  const setName = useGlobalStore((state) => state.setName)
  const canEdit = useGlobalStore(selectCanEdit)

  return (
    <InlineEdit
      value={name ?? ""}
      onSave={setName}
      readOnly={!canEdit}
      readOnlyTitle={t("planner.read_only")}
      className="max-w-[220px] font-heading text-base font-semibold"
    />
  )
}
