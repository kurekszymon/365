import { PlusCircleIcon } from "lucide-react"

import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { ScalePill } from "./ScalePill"

import { usePlannerStore } from "@/stores/planner.store"

export const Canvas = () => {
  const { t } = useTranslation()

  const tables = usePlannerStore(
    useShallow((state) => ({ list: state.tables, update: state.updateTables }))
  )

  if (tables.list.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div
          className="flex h-64 w-64 cursor-pointer flex-col items-center justify-center gap-3 text-muted-foreground"
          onClick={() => {
            // TODO: take input / add it properly
            tables.update({
              capacity: 4,
              id: "table-id",
              name: "Table!",
              shape: "rectangular",
            })
          }}
        >
          <PlusCircleIcon className="h-10 w-10 opacity-30" />
          <p className="text-sm">{t("tables.empty_state")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute" />
      <ScalePill />
    </div>
  )
}
