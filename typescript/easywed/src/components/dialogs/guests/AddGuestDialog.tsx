import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import type { Dietary } from "@/stores/planner.store"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"

const DIETARY_OPTIONS: Array<Dietary> = [
  "gluten-free",
  "halal",
  "kosher",
  "vegan",
]

export const AddGuestDialog = () => {
  const [dietaryOptions, setDietaryOptions] = useState<Array<Dietary>>([])

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
      open: state.open,
    }))
  )
  return (
    <Dialog
      open={dialog.opened === "Guest.Add"}
      onOpenChange={(open) => {
        if (!open) {
          dialog.close()
        }
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>Add Guest</DialogTitle>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <FieldContent>
            <Input
              placeholder="Guest name"
              type="text"
              className="w-full rounded-md border"
            />
            <Field>
              <FieldLabel>Dietary Preferences</FieldLabel>
              <FieldContent className="flex-row gap-1.5">
                {DIETARY_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    variant={
                      dietaryOptions.includes(option) ? "default" : "outline"
                    }
                    className="rounded-full"
                    onClick={() => {
                      if (dietaryOptions.includes(option)) {
                        setDietaryOptions(
                          dietaryOptions.filter((o) => o !== option)
                        )
                      } else {
                        setDietaryOptions([...dietaryOptions, option])
                      }
                    }}
                  >
                    {option}
                  </Button>
                ))}
              </FieldContent>
            </Field>
          </FieldContent>
        </Field>
      </DialogContent>
    </Dialog>
  )
}
