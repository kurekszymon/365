import { toast } from "sonner"
import i18n from "@/i18n"
import { usePlannerStore } from "@/stores/planner.store"

// Deletes act at once and offer an Undo toast instead of asking first -
// forgiveness over confirmation. The rows are only soft-deleted, so the undo
// is cheap. Each toast is keyed by the entity, so deleting the same item again
// after an undo replaces its toast instead of stacking a second one.
const UNDO_TOAST_MS = 6000

const offerUndo = (
  id: string,
  title: string,
  name: string,
  restore: () => boolean
) => {
  toast(title, {
    id: `deleted:${id}`,
    description: name.trim() || undefined,
    duration: UNDO_TOAST_MS,
    action: {
      label: i18n.t("common.undo"),
      onClick: () => {
        if (!restore()) toast.error(i18n.t("common.undo_unavailable"))
      },
    },
  })
}

export const deleteTableWithUndo = (id: string) => {
  const { deleteTable, restoreTable } = usePlannerStore.getState()
  const deleted = deleteTable(id)
  if (!deleted) return
  offerUndo(id, i18n.t("tables.deleted"), deleted.table.name, () =>
    restoreTable(deleted)
  )
}

export const deleteFixtureWithUndo = (id: string) => {
  const { deleteFixture, restoreFixture } = usePlannerStore.getState()
  const deleted = deleteFixture(id)
  if (!deleted) return
  offerUndo(id, i18n.t("fixtures.deleted"), deleted.fixture.name, () =>
    restoreFixture(deleted)
  )
}
