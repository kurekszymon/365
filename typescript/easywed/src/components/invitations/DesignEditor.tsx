import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDownIcon, GripVertical, MailIcon } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TemplateGallery } from "./TemplateGallery"
import { QuantityPicker } from "./QuantityPicker"
import { GuestNamesPicker } from "./GuestNamesPicker"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"
import type { InvitationSide, InvitationTexts } from "@/stores/invitation.store"
import { useInvitationStore } from "@/stores/invitation.store"
import { useDialogStore } from "@/stores/dialog.store"
import {
  COLOR_SCHEME_LABEL_KEYS,
  FIELD_LABEL_KEYS,
  TEMPLATES,
  TEXT_MAX_LENGTHS,
} from "@/lib/invitation/templates"
import { FONT_OPTIONS } from "@/lib/invitation/fonts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type FieldKey = keyof InvitationTexts

interface FieldCardProps {
  fieldKey: FieldKey
  value: string
  placeholder?: string
  onChange: (val: string) => void
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  innerRef?: (el: HTMLDivElement | null) => void
  style?: React.CSSProperties
  className?: string
}

function FieldCard({
  fieldKey,
  value,
  placeholder,
  onChange,
  isDragging,
  dragHandleProps,
  innerRef,
  style,
  className,
}: FieldCardProps) {
  const { t } = useTranslation()

  return (
    <div
      ref={innerRef}
      style={style}
      className={cn(
        "relative rounded-md border bg-background p-2 pt-1.5 shadow-sm transition-shadow",
        isDragging ? "opacity-40" : "hover:shadow-md",
        className
      )}
    >
      {/* Drag handle — top right */}
      <button
        type="button"
        aria-label={t("invitations.field_drag_handle")}
        className="absolute top-1.5 right-1.5 cursor-grab touch-none text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        tabIndex={-1}
        {...dragHandleProps}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-col gap-1 pr-5">
        <label
          className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
          htmlFor={`inv-${fieldKey}`}
        >
          {t(FIELD_LABEL_KEYS[fieldKey])}
        </label>
        <Input
          id={`inv-${fieldKey}`}
          value={value}
          placeholder={placeholder}
          maxLength={TEXT_MAX_LENGTHS[fieldKey]}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    </div>
  )
}

interface SortableFieldProps {
  fieldKey: FieldKey
  value: string
  placeholder?: string
  onChange: (val: string) => void
}

function SortableField({
  fieldKey,
  value,
  placeholder,
  onChange,
}: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldKey })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <FieldCard
      fieldKey={fieldKey}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      isDragging={isDragging}
      dragHandleProps={
        {
          ...listeners,
          ...attributes,
        } as React.HTMLAttributes<HTMLButtonElement>
      }
      innerRef={setNodeRef}
      style={style}
    />
  )
}

interface DropZoneProps {
  sideId: InvitationSide
  label: string
  fields: Array<FieldKey>
  texts: InvitationTexts
  onTextChange: (key: FieldKey, val: string) => void
  fieldPlaceholders: Partial<Record<FieldKey, string>>
  isOver: boolean
}

function DropZone({
  sideId,
  label,
  fields,
  texts,
  onTextChange,
  fieldPlaceholders,
  isOver,
}: DropZoneProps) {
  const { setNodeRef } = useDroppable({ id: sideId })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[80px] flex-1 flex-col gap-1.5 rounded-lg border-2 p-2 transition-colors",
        isOver
          ? "border-primary/60 bg-primary/5"
          : "border-dashed border-muted-foreground/20 bg-muted/10"
      )}
      data-zone={sideId}
    >
      <p className="px-0.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <SortableContext items={fields} strategy={verticalListSortingStrategy}>
        {fields.map((key) => (
          <SortableField
            key={key}
            fieldKey={key}
            value={texts[key]}
            placeholder={fieldPlaceholders[key]}
            onChange={(val) => onTextChange(key, val)}
          />
        ))}
      </SortableContext>
      {fields.length === 0 && (
        <p className="py-3 text-center text-xs text-muted-foreground/40">—</p>
      )}
    </div>
  )
}

export function DesignEditor() {
  const { t } = useTranslation()
  const design = useInvitationStore((s) => s.design)
  const updateTexts = useInvitationStore((s) => s.updateTexts)
  const updateDesign = useInvitationStore((s) => s.updateDesign)
  const reorderFields = useInvitationStore((s) => s.reorderFields)
  const setFieldSideAndOrder = useInvitationStore((s) => s.setFieldSideAndOrder)
  const openDialog = useDialogStore((s) => s.open)
  const [styleOpen, setStyleOpen] = useState(true)
  const [activeId, setActiveId] = useState<FieldKey | null>(null)
  const [overZone, setOverZone] = useState<InvitationSide | null>(null)

  const currentTemplate = TEMPLATES.find((tmpl) => tmpl.id === design.template)

  const fieldPlaceholders: Partial<Record<FieldKey, string>> = {
    headline: t("invitations.text_headline_placeholder"),
    coupleNames: t("invitations.gallery.preview_couple"),
    date: t("invitations.gallery.preview_date"),
    time: t("invitations.gallery.preview_time"),
    venue: t("invitations.gallery.preview_venue"),
    venueAddress: t("invitations.gallery.preview_venue_address"),
    rsvpEmail: t("invitations.gallery.preview_rsvp_email"),
    rsvpDeadline: t("invitations.gallery.preview_rsvp_deadline"),
    guestSalutation: t("invitations.salutation"),
  }

  const frontFields = design.fieldOrder.filter(
    (k) => design.fieldSides[k] === "front"
  )
  const backFields = design.fieldOrder.filter(
    (k) => design.fieldSides[k] === "back"
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getZoneForId(id: string): InvitationSide | null {
    if (id === "front" || id === "back") return id as InvitationSide
    return design.fieldSides[id as FieldKey]
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as FieldKey)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) {
      setOverZone(null)
      return
    }

    const targetZone = getZoneForId(over.id as string)
    setOverZone(targetZone)

    const activeField = active.id as FieldKey
    const currentSide = design.fieldSides[activeField]
    if (targetZone && targetZone !== currentSide) {
      // Optimistically move to target side for live feedback
      const newOrder = [...design.fieldOrder]
      const overIdStr = over.id as string
      const overIsField = overIdStr !== "front" && overIdStr !== "back"

      if (overIsField) {
        const overField = overIdStr as FieldKey
        const fromIdx = newOrder.indexOf(activeField)
        const toIdx = newOrder.indexOf(overField)
        setFieldSideAndOrder(
          activeField,
          targetZone,
          arrayMove(newOrder, fromIdx, toIdx)
        )
      } else {
        setFieldSideAndOrder(activeField, targetZone, newOrder)
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setOverZone(null)

    if (!over || active.id === over.id) return

    const activeField = active.id as FieldKey
    const overId = over.id as string

    const overIsField = overId !== "front" && overId !== "back"
    if (overIsField) {
      const overField = overId as FieldKey
      const activeSide = design.fieldSides[activeField]
      const overSide = design.fieldSides[overField]

      const newOrder = [...design.fieldOrder]
      const fromIdx = newOrder.indexOf(activeField)
      const toIdx = newOrder.indexOf(overField)

      if (fromIdx !== toIdx) {
        const reordered = arrayMove(newOrder, fromIdx, toIdx)
        if (activeSide !== overSide) {
          setFieldSideAndOrder(activeField, overSide, reordered)
        } else {
          reorderFields(reordered)
        }
      }
    }
  }

  function handleDragCancel() {
    setActiveId(null)
    setOverZone(null)
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Collapsible: Template & Style ── */}
      <section className="flex flex-col gap-3">
        <button
          className="flex w-full items-center justify-between"
          onClick={() => setStyleOpen((v) => !v)}
        >
          <p className="text-sm font-semibold">
            {t("invitations.step_style_template")}
          </p>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              styleOpen && "rotate-180"
            )}
          />
        </button>

        {styleOpen && (
          <div className="flex flex-col gap-4">
            <TemplateGallery />
            <Separator />

            {/* Font picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="inv-font">
                {t("invitations.font")}
              </label>
              <Select
                value={design.fontId}
                onValueChange={(id) => updateDesign({ fontId: id })}
              >
                <SelectTrigger id="inv-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      <span style={{ fontFamily: font.css }}>{font.label}</span>
                      <span
                        className="ml-2 text-xs text-muted-foreground"
                        style={{ fontFamily: font.css }}
                      >
                        Ąę Óśź
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color scheme */}
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">
                {t("invitations.color_scheme")}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentTemplate?.colorSchemes.map((scheme) => (
                  <button
                    key={scheme}
                    onClick={() => updateDesign({ colorScheme: scheme })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      design.colorScheme === scheme
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    {t(COLOR_SCHEME_LABEL_KEYS[scheme])}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <Separator />

      {/* ── Content — DnD two-column ── */}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{t("invitations.step_text")}</p>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-2">
            <DropZone
              sideId="front"
              label={t("invitations.awers")}
              fields={frontFields}
              texts={design.texts}
              onTextChange={(key, val) => updateTexts({ [key]: val })}
              fieldPlaceholders={fieldPlaceholders}
              isOver={overZone === "front"}
            />
            <DropZone
              sideId="back"
              label={t("invitations.rewers")}
              fields={backFields}
              texts={design.texts}
              onTextChange={(key, val) => updateTexts({ [key]: val })}
              fieldPlaceholders={fieldPlaceholders}
              isOver={overZone === "back"}
            />
          </div>
          <DragOverlay>
            {activeId ? (
              <FieldCard
                fieldKey={activeId}
                value={design.texts[activeId]}
                placeholder={fieldPlaceholders[activeId]}
                onChange={() => {}}
                className="rotate-1 shadow-xl"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        <p className="text-xs text-muted-foreground">
          {t("invitations.step_text_dnd_hint")}
        </p>
      </section>

      <Separator />

      {/* ── Guests ── */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{t("invitations.step_guests")}</p>
        <GuestNamesPicker />
      </section>

      <Separator />

      {/* ── Quantity & Order ── */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold">
          {t("invitations.step_quantity")}
        </p>
        <QuantityPicker />
        <Button onClick={() => openDialog("Invitation.Order")}>
          <MailIcon />
          {t("invitations.order")}
        </Button>
      </section>
    </div>
  )
}
