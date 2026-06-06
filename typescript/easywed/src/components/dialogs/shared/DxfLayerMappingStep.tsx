import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { LayerMapping, LayerRole } from "@/lib/import/plannerDxf"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLES: Array<LayerRole> = [
  "hall",
  "tables",
  "fixtures",
  "labels",
  "ignore",
]

interface DxfLayerMappingStepProps {
  layers: Array<string>
  initial: LayerMapping
  onCancel: () => void
  onConfirm: (mapping: LayerMapping) => void
}

export const DxfLayerMappingStep = ({
  layers,
  initial,
  onCancel,
  onConfirm,
}: DxfLayerMappingStepProps) => {
  const { t } = useTranslation()
  const [mapping, setMapping] = useState<LayerMapping>(initial)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t("import.dxf.step.layers_intro")}
      </p>
      <div className="flex flex-col gap-2">
        {layers.map((layer) => (
          <Field key={layer} className="flex-row items-center gap-3">
            <FieldLabel className="flex-1 truncate font-mono text-xs">
              {layer || t("import.dxf.layer.default")}
            </FieldLabel>
            <FieldContent className="flex-1">
              <Select
                value={mapping[layer] ?? "ignore"}
                onValueChange={(v) =>
                  setMapping((m) => ({ ...m, [layer]: v as LayerRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`import.dxf.layer.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        ))}
      </div>
      <ButtonGroup className="justify-end">
        <Button variant="outline" onClick={onCancel}>
          {t("import.dxf.back")}
        </Button>
        <Button onClick={() => onConfirm(mapping)}>
          {t("import.dxf.next")}
        </Button>
      </ButtonGroup>
    </div>
  )
}
