import { useGlobalStore } from "@/stores/global.store"
import { InlineEdit } from "@/components/ui/inline-edit"

export const WeddingName = () => {
  const name = useGlobalStore((state) => state.name)
  const setName = useGlobalStore((state) => state.setName)

  return (
    <InlineEdit
      value={name ?? ""}
      onSave={setName}
      className="max-w-[140px] text-sm font-semibold"
    />
  )
}
