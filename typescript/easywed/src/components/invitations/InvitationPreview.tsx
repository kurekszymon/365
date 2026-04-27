import { createPortal, flushSync } from "react-dom"
import { Fragment, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { MoveIcon, PrinterIcon } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { ClassicTemplate } from "./templates/ClassicTemplate"
import { ModernTemplate } from "./templates/ModernTemplate"
import { RomanticTemplate } from "./templates/RomanticTemplate"
import { ShareButton } from "./ShareButton"
import type { DragEndEvent, DragStartEvent, Modifier } from "@dnd-kit/core"
import type {
  InvitationColorScheme,
  InvitationSide,
  InvitationTemplate,
  InvitationTexts,
} from "@/stores/invitation.store"
import { useInvitationStore } from "@/stores/invitation.store"
import { Button } from "@/components/ui/button"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"
import { getFontCss } from "@/lib/invitation/fonts"

import { cn } from "@/lib/utils"

type TemplateComponent = React.ComponentType<{
  texts: InvitationTexts
  colorScheme: InvitationColorScheme
  fontCss: string
  guestName?: string
  side: InvitationSide
  fieldSides: Record<keyof InvitationTexts, InvitationSide>
  fieldOrder: Array<keyof InvitationTexts>
  wrapField?: (
    key: keyof InvitationTexts,
    content: React.ReactNode
  ) => React.ReactNode
}>

const CARD_W = 585
const CARD_H = 830

const TEMPLATE_MAP = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  romantic: RomanticTemplate,
} satisfies Record<InvitationTemplate, TemplateComponent>

function SortableItem({
  id,
  scale,
  children,
}: {
  id: string
  scale: number
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { overlay: children } })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`
          : undefined,
        transition,
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0 : undefined,
        userSelect: "none",
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

function FreeDraggableField({
  id,
  pos,
  scale,
  children,
}: {
  id: string
  pos: { x: number; y: number }
  scale: number
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        // Modifier on DndContext has already clamped transform to card bounds (screen px).
        // Divide by scale to apply in card-space so the element follows 1:1.
        transform: transform
          ? `translate(${transform.x / scale}px, ${transform.y / scale}px)`
          : undefined,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

export function InvitationPreview() {
  const { t } = useTranslation()
  const design = useInvitationStore((s) => s.design)
  const reorderFields = useInvitationStore((s) => s.reorderFields)
  const setFieldPosition = useInvitationStore((s) => s.setFieldPosition)
  const guests = design.guestNames.length > 0 ? design.guestNames : undefined
  const Component = TEMPLATE_MAP[design.template]
  const fontCss = getFontCss(design.fontId)

  const [previewSide, setPreviewSide] = useState<InvitationSide>("front")
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [printAll, setPrintAll] = useState(false)
  const [activeOverlayContent, setActiveOverlayContent] =
    useState<React.ReactNode>(null)

  const cardRef = useRef<HTMLDivElement | null>(null)

  // Modifier: restrict free-drag to the card's screen-space bounds.
  // getBoundingClientRect() is scale-aware so no manual scale arithmetic needed.
  const restrictToCard: Modifier = ({ transform, draggingNodeRect }) => {
    if (!cardRef.current || !draggingNodeRect) return transform
    const card = cardRef.current.getBoundingClientRect()
    return {
      ...transform,
      x: Math.max(
        card.left - draggingNodeRect.left,
        Math.min(card.right - draggingNodeRect.right, transform.x)
      ),
      y: Math.max(
        card.top - draggingNodeRect.top,
        Math.min(card.bottom - draggingNodeRect.bottom, transform.y)
      ),
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const PREVIEW_W = 400
  const scale = PREVIEW_W / CARD_W
  const scaledH = CARD_H * scale
  const colorTokens = COLOR_SCHEMES[design.colorScheme]

  // Screen-only: fall back to placeholder text so the preview always looks complete.
  const previewTexts: InvitationTexts = {
    headline:
      design.texts.headline || t("invitations.gallery.preview_headline"),
    coupleNames:
      design.texts.coupleNames || t("invitations.gallery.preview_couple"),
    date: design.texts.date || t("invitations.gallery.preview_date"),
    time: design.texts.time || t("invitations.gallery.preview_time"),
    venue: design.texts.venue || t("invitations.gallery.preview_venue"),
    venueAddress:
      design.texts.venueAddress ||
      t("invitations.gallery.preview_venue_address"),
    rsvpEmail:
      design.texts.rsvpEmail || t("invitations.gallery.preview_rsvp_email"),
    rsvpDeadline:
      design.texts.rsvpDeadline ||
      t("invitations.gallery.preview_rsvp_deadline"),
    guestSalutation: design.texts.guestSalutation,
    footer: design.texts.footer,
  }

  const sharedProps = {
    colorScheme: design.colorScheme,
    fontCss,
    fieldSides: design.fieldSides,
    fieldOrder: design.fieldOrder,
  }

  const sideFields = design.fieldOrder.filter(
    (k) => design.fieldSides[k] === previewSide
  )

  function getDefaultFreePos(key: keyof InvitationTexts): {
    x: number
    y: number
  } {
    const idx = sideFields.indexOf(key)
    return { x: 64, y: 100 + idx * 80 }
  }

  function handleSnapDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = design.fieldOrder.indexOf(active.id as keyof InvitationTexts)
    const to = design.fieldOrder.indexOf(over.id as keyof InvitationTexts)
    if (from !== -1 && to !== -1) {
      reorderFields(arrayMove(design.fieldOrder, from, to))
    }
  }

  function handleDragStart(event: DragStartEvent) {
    if (!snapEnabled) return

    setActiveOverlayContent(
      (event.active.data.current?.overlay as React.ReactNode | undefined) ??
        null
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    if (snapEnabled) {
      handleSnapDragEnd(event)
    } else {
      handleFreeDragEnd(event)
    }

    setActiveOverlayContent(null)
  }

  function handleDragCancel() {
    setActiveOverlayContent(null)
  }

  function handleFreeDragEnd(event: DragEndEvent) {
    const { active, delta } = event
    const key = active.id as keyof InvitationTexts
    const pos = design.fieldPositions[key] ?? getDefaultFreePos(key)
    setFieldPosition(key, {
      x: Math.round(Math.max(0, Math.min(CARD_W, pos.x + delta.x / scale))),
      y: Math.round(Math.max(0, Math.min(CARD_H, pos.y + delta.y / scale))),
    })
  }

  function wrapFieldSnap(key: keyof InvitationTexts, content: React.ReactNode) {
    return (
      <SortableItem key={key} id={key} scale={scale}>
        {content}
      </SortableItem>
    )
  }

  function wrapFieldFree(key: keyof InvitationTexts, content: React.ReactNode) {
    const pos = design.fieldPositions[key] ?? getDefaultFreePos(key)
    return (
      <FreeDraggableField key={key} id={key} pos={pos} scale={scale}>
        {content}
      </FreeDraggableField>
    )
  }

  // Print equivalent of wrapFieldFree: applies the stored card-space position
  // without any DnD interactivity. Used when printing in free-drag mode so the
  // printed output matches what the user arranged on screen.
  function wrapFieldPrint(
    key: keyof InvitationTexts,
    content: React.ReactNode
  ) {
    const pos = design.fieldPositions[key] ?? getDefaultFreePos(key)
    return (
      <div key={key} style={{ position: "absolute", left: pos.x, top: pos.y }}>
        {content}
      </div>
    )
  }

  const handlePrintPreview = () => {
    flushSync(() => setPrintAll(false))
    window.print()
  }

  const handlePrintAll = () => {
    flushSync(() => setPrintAll(true))
    window.print()
  }

  const scaledCardStyle: React.CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: `${CARD_W}px`,
    height: `${CARD_H}px`,
    overflow: "hidden",
  }
  const overlayContent = activeOverlayContent
  const overlayTextAlign = design.template === "modern" ? undefined : "center"

  return (
    <div className="flex flex-col gap-4">
      {/* Print target — portalled to body, no DnD handles in print.
          In free-drag mode the stored fieldPositions are applied via
          wrapFieldPrint so the printed layout matches the screen arrangement. */}
      {createPortal(
        <div data-print-view className="hidden">
          {printAll && guests && guests.length > 0 ? (
            guests.map((name, idx) => (
              <Fragment key={`${idx}-${name}`}>
                <Component
                  texts={design.texts}
                  guestName={name}
                  side="front"
                  wrapField={!snapEnabled ? wrapFieldPrint : undefined}
                  {...sharedProps}
                />
                <Component
                  texts={design.texts}
                  guestName={name}
                  side="back"
                  wrapField={!snapEnabled ? wrapFieldPrint : undefined}
                  {...sharedProps}
                />
              </Fragment>
            ))
          ) : (
            <>
              <Component
                texts={design.texts}
                side="front"
                wrapField={!snapEnabled ? wrapFieldPrint : undefined}
                {...sharedProps}
              />
              <Component
                texts={design.texts}
                side="back"
                wrapField={!snapEnabled ? wrapFieldPrint : undefined}
                {...sharedProps}
              />
            </>
          )}
        </div>,
        document.body
      )}

      {/* Screen preview — card with DnD and side toggle */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={snapEnabled ? undefined : [restrictToCard]}
      >
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-lg border shadow-sm"
          style={{
            width: `${PREVIEW_W}px`,
            height: `${scaledH}px`,
            flexShrink: 0,
          }}
        >
          {snapEnabled ? (
            <SortableContext
              items={sideFields}
              strategy={verticalListSortingStrategy}
            >
              <div style={scaledCardStyle}>
                <Component
                  texts={previewTexts}
                  side={previewSide}
                  wrapField={wrapFieldSnap}
                  {...sharedProps}
                />
              </div>
            </SortableContext>
          ) : (
            <div style={scaledCardStyle}>
              <Component
                texts={previewTexts}
                side={previewSide}
                wrapField={wrapFieldFree}
                {...sharedProps}
              />
            </div>
          )}

          {/* Awers / Rewers toggle — absolute top-left */}
          <div className="absolute top-2 left-2 flex overflow-hidden rounded-md border border-white/20 shadow-md">
            {(["front", "back"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPreviewSide(s)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold transition-colors",
                  previewSide === s
                    ? "bg-black/60 text-white"
                    : "bg-black/20 text-white/70 hover:bg-black/40 hover:text-white"
                )}
              >
                {s === "front"
                  ? t("invitations.awers")
                  : t("invitations.rewers")}
              </button>
            ))}
          </div>

          {/* Snap / Free toggle — absolute top-right */}
          <button
            onClick={() => setSnapEnabled((v) => !v)}
            title={
              snapEnabled ? t("invitations.snap_on") : t("invitations.snap_off")
            }
            className={cn(
              "absolute top-2 right-2 flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs font-semibold shadow-md transition-colors",
              snapEnabled
                ? "bg-black/60 text-white"
                : "bg-black/20 text-white/70 hover:bg-black/40 hover:text-white"
            )}
          >
            <MoveIcon className="h-3 w-3" />
            {snapEnabled ? t("invitations.snap_on") : t("invitations.snap_off")}
          </button>
        </div>
        <DragOverlay dropAnimation={null}>
          {snapEnabled && overlayContent ? (
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: "max-content",
                fontFamily: fontCss,
                color: colorTokens.text,
                textAlign: overlayTextAlign,
                userSelect: "none",
                touchAction: "none",
              }}
            >
              {overlayContent}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <ShareButton />
        <Button variant="outline" onClick={handlePrintPreview}>
          <PrinterIcon />
          {t("invitations.print_preview")}
        </Button>
        {guests && guests.length > 0 && (
          <Button variant="outline" onClick={handlePrintAll}>
            <PrinterIcon />
            {t("invitations.print_all", { count: guests.length })}
          </Button>
        )}
      </div>
    </div>
  )
}
