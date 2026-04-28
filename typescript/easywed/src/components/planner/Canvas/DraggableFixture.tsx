import { useDraggable } from "@dnd-kit/core"
import { CopyIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CanvasActionButton } from "./CanvasActionButton"
import { FixtureVisual } from "./FixtureVisual"
import type { Fixture } from "@/stores/planner.store"
import { cn } from "@/lib/utils"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"

type DraggableFixtureProps = {
  fixture: Fixture
  hallWidth: number
  hallHeight: number
  ppm: number
}

export const DraggableFixture = ({
  fixture,
  hallWidth,
  hallHeight,
  ppm,
}: DraggableFixtureProps) => {
  const { t } = useTranslation()

  const isSelected = usePanelStore(
    (state) =>
      state.view?.kind === "fixture.edit" && state.view.fixtureId === fixture.id
  )

  const openFixtureEdit = usePanelStore((state) => state.openFixtureEdit)
  const deselectPanel = usePanelStore((state) => state.deselect)
  const duplicateFixture = usePlannerStore((state) => state.duplicateFixture)
  const deleteFixture = usePlannerStore((state) => state.deleteFixture)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: fixture.id,
    data: { type: "fixture-drag" },
  })

  return (
    <FixtureVisual
      ref={setNodeRef}
      fixture={fixture}
      ppm={ppm}
      transform={transform}
      hallBounds={{ width: hallWidth, height: hallHeight }}
      className={cn(
        "z-10 cursor-grab touch-none shadow-sm active:cursor-grabbing",
        isSelected && "ring-2 ring-slate-600 ring-offset-2"
      )}
      {...listeners}
      {...attributes}
    >
      {isSelected && (
        <div
          className="absolute -top-8 right-0 flex gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CanvasActionButton
            icon={<CopyIcon className="size-3.5" />}
            label={t("fixtures.duplicate")}
            onClick={(e) => {
              e.stopPropagation()
              const newId = duplicateFixture(fixture.id)
              if (newId) openFixtureEdit(newId)
            }}
          />
          <CanvasActionButton
            icon={<Trash2Icon className="size-3.5" />}
            label={t("fixtures.delete")}
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              deleteFixture(fixture.id)
              deselectPanel()
            }}
          />
        </div>
      )}
    </FixtureVisual>
  )
}
