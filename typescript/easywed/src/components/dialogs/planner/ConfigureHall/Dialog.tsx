import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { HallPreview } from "./Preview"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDialogStore } from "@/stores/dialog.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type HallPreset = "rectangle" | "l-shape" | "u-shape" | "custom"

const PRESETS: Record<HallPreset, string> = {
  rectangle: "Rectangle",
  "l-shape": "L-shape",
  "u-shape": "U-shape",
  custom: "Custom",
}

export const HallConfigureDialog = () => {
  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
      open: state.open,
    }))
  )

  const [preset, setPreset] = useState<HallPreset>("rectangle")
  const [width, setWidth] = useState(20)
  const [height, setHeight] = useState(12)

  return (
    <Dialog
      open={dialog.opened === "Hall.Configure"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Configure wedding hall</DialogTitle>
        </DialogHeader>

        {/* Preset selector */}
        <Field>
          <FieldLabel>Hall Shape</FieldLabel>
          <FieldContent className="flex-row gap-1.5">
            {Object.entries(PRESETS).map(([value, label]) => (
              <Button
                key={value}
                className="rounded-full"
                variant={preset === value ? "default" : "outline"}
                onClick={() => setPreset(value as HallPreset)}
              >
                {label}
              </Button>
            ))}
          </FieldContent>
        </Field>

        {/* Dimensions */}
        {preset === "rectangle" && (
          <Field>
            <FieldContent className="flex-row gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="hall-width">Width</Label>
                <Input
                  id="hall-width"
                  type="number"
                  min={1}
                  max={200}
                  value={width}
                  onChange={(e) =>
                    setWidth(Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="hall-height">Length</Label>
                <Input
                  id="hall-height"
                  type="number"
                  min={1}
                  max={200}
                  value={height}
                  onChange={(e) =>
                    setHeight(Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
            </FieldContent>
          </Field>
        )}

        <HallPreview preset={preset} width={width} height={height} />
      </DialogContent>
    </Dialog>
  )
}
