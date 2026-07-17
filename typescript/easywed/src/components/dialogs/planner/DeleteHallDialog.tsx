import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDialogStore } from "@/stores/dialog.store"
import { usePanelStore } from "@/stores/panel.store"
import { usePlannerStore } from "@/stores/planner.store"

// Confirms deleting a hall and decides what happens to its tables/fixtures:
// move them into another hall (positions clamped into it) or delete them too.
// Deleting the only hall always deletes its contents and returns the canvas
// to the empty state.
export const DeleteHallDialog = () => {
  const { t } = useTranslation()

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      hallId: state.payload.hallId,
      close: state.close,
    }))
  )
  const closePanel = usePanelStore((state) => state.close)

  const { halls, tables, fixtures, deleteHall } = usePlannerStore(
    useShallow((state) => ({
      halls: state.halls,
      tables: state.tables,
      fixtures: state.fixtures,
      deleteHall: state.deleteHall,
    }))
  )

  const hall = halls.find((h) => h.id === dialog.hallId)
  const otherHalls = halls.filter((h) => h.id !== dialog.hallId)
  const contentCount = hall
    ? tables.filter((t2) => t2.hallId === hall.id).length +
      fixtures.filter((f) => f.hallId === hall.id).length
    : 0

  const canMove = otherHalls.length > 0 && contentCount > 0
  const [mode, setMode] = useState<"move" | "delete">("move")
  const [targetHallId, setTargetHallId] = useState<string | undefined>(
    undefined
  )

  const effectiveMode = canMove ? mode : "delete"
  const effectiveTarget = targetHallId ?? otherHalls[0]?.id

  const hallLabel = (index: number, name: string) =>
    name.trim() || t("hall.unnamed_index", { index: index + 1 })

  const confirm = () => {
    if (!hall) return
    deleteHall(
      hall.id,
      effectiveMode === "move" && effectiveTarget
        ? { kind: "move", targetHallId: effectiveTarget }
        : { kind: "delete" }
    )
    closePanel()
    dialog.close()
  }

  return (
    <ResponsiveDialog
      open={dialog.opened === "Planner.Hall.Delete"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
    >
      <ResponsiveDialogContent
        className="sm:max-w-md"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("hall.delete_title", {
              name: hall
                ? hallLabel(
                    halls.findIndex((h) => h.id === hall.id),
                    hall.name
                  )
                : "",
            })}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col gap-4">
          {contentCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("hall.delete_empty_hint")}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("hall.delete_contents_hint", { count: contentCount })}
              </p>

              {canMove && (
                <Field>
                  <FieldLabel>{t("hall.delete_contents_question")}</FieldLabel>
                  <FieldContent className="flex flex-col gap-2">
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        variant={effectiveMode === "move" ? "default" : "outline"}
                        onClick={() => setMode("move")}
                      >
                        {t("hall.delete_move_option")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        variant={
                          effectiveMode === "delete" ? "default" : "outline"
                        }
                        onClick={() => setMode("delete")}
                      >
                        {t("hall.delete_delete_option")}
                      </Button>
                    </div>
                    {effectiveMode === "move" && (
                      <Select
                        value={effectiveTarget}
                        onValueChange={setTargetHallId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {otherHalls.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {hallLabel(
                                halls.findIndex((x) => x.id === h.id),
                                h.name
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FieldContent>
                </Field>
              )}

              {!canMove && (
                <p className="text-sm text-destructive">
                  {t("hall.delete_last_warning")}
                </p>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={dialog.close}>
              {t("common.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirm}>
              {t("hall.delete_confirm")}
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
