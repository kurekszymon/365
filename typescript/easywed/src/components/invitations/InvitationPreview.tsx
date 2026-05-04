import { createPortal, flushSync } from "react-dom"
import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  BoldIcon,
  ItalicIcon,
  MoveIcon,
  PrinterIcon,
  Trash2Icon,
  UnderlineIcon,
  XIcon,
} from "lucide-react"
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
import type { TemplateProps } from "./templates/types"
import type { DragEndEvent, DragStartEvent, Modifier } from "@dnd-kit/core"
import type {
  FieldFormat,
  InvitationSide,
  InvitationTemplate,
  InvitationTexts,
  SeparatorConfig,
  SeparatorStyle,
} from "@/stores/invitation.store"
import { useInvitationStore } from "@/stores/invitation.store"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"
import { FONT_OPTIONS, getFontCss } from "@/lib/invitation/fonts"
import {
  CARD_H,
  CARD_W,
  FIELD_LABEL_KEYS,
  SEPARATOR_STYLE_OPTIONS,
  TEXT_MAX_LENGTHS,
  isFieldKey,
  isSeparatorId,
  isTxtId,
  makeTxtId,
} from "@/lib/invitation/templates"
import { cn } from "@/lib/utils"

const TEMPLATE_MAP = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  romantic: RomanticTemplate,
} satisfies Record<InvitationTemplate, React.ComponentType<TemplateProps>>

// --- InlineTextarea ---

function InlineTextarea({
  maxLength,
  draft,
  onDraftChange,
  onCommit,
  onCancel,
  matchStyle = {},
}: {
  maxLength: number
  draft: string
  onDraftChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
  matchStyle?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = "auto"
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [draft])

  return (
    <textarea
      ref={ref}
      value={draft}
      maxLength={maxLength}
      autoFocus
      onChange={(e) => onDraftChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          onCommit()
        } else if (e.key === "Escape") {
          e.preventDefault()
          onCancel()
        }
        e.stopPropagation()
      }}
      onBlur={() => setTimeout(onCommit, 150)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        minHeight: "100%",
        background: "transparent",
        border: "none",
        outline: "none",
        resize: "none",
        fontFamily: "inherit",
        fontSize: "inherit",
        color: "inherit",
        textAlign: "inherit",
        padding: 0,
        zIndex: 10,
        boxSizing: "border-box",
        overflow: "hidden",
        caretColor: "rgba(59,130,246,0.9)",
        ...matchStyle,
      }}
    />
  )
}

// --- SortableItem ---
// NOTE: children are stored in useSortable data so the DragOverlay can show them.

function SortableItem({
  id,
  scale,
  children,
  isSelected,
  isEditing,
  isSeparator,
  onSelect,
  onEdit,
  onContext,
  editOverlay,
  onRefCapture,
}: {
  id: string
  scale: number
  children: React.ReactNode
  isSelected: boolean
  isEditing: boolean
  isSeparator: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onContext: (id: string, e: React.MouseEvent) => void
  editOverlay: React.ReactNode
  onRefCapture?: (el: Element | null) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { isSeparator, overlay: children } })

  const composedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      onRefCapture?.(el)
    },
    [setNodeRef, onRefCapture]
  )

  return (
    <div
      ref={composedRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`
          : undefined,
        transition,
        cursor: isEditing ? "default" : isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0 : undefined,
        userSelect: "none",
        touchAction: "none",
        position: "relative",
        alignSelf: isSeparator ? "stretch" : undefined,
        boxShadow:
          isSelected || isEditing
            ? "inset 0 0 0 2px rgba(59,130,246,0.7)"
            : undefined,
        borderRadius: "2px",
      }}
      {...attributes}
      {...(!isEditing ? listeners : {})}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEdit(id)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContext(id, e)
      }}
    >
      <div style={{ visibility: isEditing ? "hidden" : undefined }}>
        {children}
      </div>
      {editOverlay}
    </div>
  )
}

// --- FreeDraggableField ---

function FreeDraggableField({
  id,
  pos,
  scale,
  children,
  isSelected,
  isEditing,
  isSeparator,
  onSelect,
  onEdit,
  onContext,
  editOverlay,
  onRefCapture,
}: {
  id: string
  pos: { x: number; y: number }
  scale: number
  children: React.ReactNode
  isSelected: boolean
  isEditing: boolean
  isSeparator: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onContext: (id: string, e: React.MouseEvent) => void
  editOverlay: React.ReactNode
  onRefCapture?: (el: Element | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id })

  const composedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      onRefCapture?.(el)
    },
    [setNodeRef, onRefCapture]
  )

  return (
    <div
      ref={composedRef}
      style={{
        position: "absolute",
        left: isSeparator ? 0 : pos.x,
        top: pos.y,
        width: isSeparator ? CARD_W : undefined,
        transform: transform
          ? `translate(${transform.x / scale}px, ${transform.y / scale}px)`
          : undefined,
        cursor: isEditing ? "default" : isDragging ? "grabbing" : "pointer",
        userSelect: "none",
        touchAction: "none",
        boxShadow:
          isSelected && !isEditing
            ? "inset 0 0 0 2px rgba(59,130,246,0.7)"
            : undefined,
        borderRadius: "2px",
      }}
      {...attributes}
      {...(!isEditing ? listeners : {})}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEdit(id)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContext(id, e)
      }}
    >
      <div style={{ position: "relative" }}>
        <div style={{ visibility: isEditing ? "hidden" : undefined }}>
          {children}
        </div>
        {editOverlay}
      </div>
    </div>
  )
}

// --- FloatingToolbar ---

function ToolbarDivider() {
  return (
    <div
      style={{
        width: "1px",
        height: "16px",
        background: "rgba(255,255,255,0.2)",
        margin: "0 2px",
      }}
    />
  )
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center justify-center rounded p-1 transition-colors",
        active
          ? "bg-white/30 text-white"
          : "text-white/60 hover:bg-white/15 hover:text-white"
      )}
    >
      {children}
    </button>
  )
}

const THICKNESS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0.5, label: "·" },
  { value: 1, label: "—" },
  { value: 2, label: "─" },
  { value: 4, label: "━" },
]

function FloatingToolbar({
  selectedId,
  pos,
  fieldFonts,
  fieldFormats,
  separatorStyles,
  separatorConfigs,
  onSetFieldFont,
  onSetFieldFormat,
  onSetSeparatorStyle,
  onSetSeparatorConfig,
  onRemoveSeparator,
  onDeselect,
}: {
  selectedId: string | null
  pos: { top: number; left: number } | null
  fieldFonts: Partial<Record<keyof InvitationTexts, string>>
  fieldFormats: Partial<Record<string, FieldFormat>>
  separatorStyles: Record<string, SeparatorStyle>
  separatorConfigs: Record<string, SeparatorConfig>
  onSetFieldFont: (key: keyof InvitationTexts, id: string | null) => void
  onSetFieldFormat: (key: string, fmt: Partial<FieldFormat>) => void
  onSetSeparatorStyle: (id: string, style: SeparatorStyle) => void
  onSetSeparatorConfig: (id: string, cfg: Partial<SeparatorConfig>) => void
  onRemoveSeparator: (id: string) => void
  onDeselect: () => void
}) {
  const { t } = useTranslation()
  if (!selectedId || !pos) return null

  const isSep = isSeparatorId(selectedId)
  const fieldKey = !isSep ? selectedId : null // string id for both predefined fields and txt blocks
  const isTextFieldKey = fieldKey !== null && isFieldKey(fieldKey)
  const fmt = fieldKey ? (fieldFormats[fieldKey] ?? {}) : null
  const currentFontId = isTextFieldKey
    ? (fieldFonts[fieldKey] ?? "__default__")
    : null
  const currentFontSize = fmt?.fontSize ?? "__auto__"
  const currentSepStyle = isSep ? (separatorStyles[selectedId] ?? "line") : null
  const sepCfg = isSep ? (separatorConfigs[selectedId] ?? {}) : null
  const currentWidthPct = sepCfg?.widthPct ?? 100
  const currentThickness = sepCfg?.thicknessPx ?? 1

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: "2px",
        background: "rgba(12,12,12,0.9)",
        borderRadius: "7px",
        padding: "4px 6px",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        whiteSpace: "nowrap",
        pointerEvents: "auto",
      }}
    >
      {fieldKey && fmt !== null && (
        <>
          <ToolbarButton
            active={!!fmt.bold}
            onClick={() =>
              onSetFieldFormat(fieldKey, { bold: fmt.bold ? undefined : true })
            }
            title="Bold"
          >
            <BoldIcon className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton
            active={!!fmt.italic}
            onClick={() =>
              onSetFieldFormat(fieldKey, {
                italic: fmt.italic ? undefined : true,
              })
            }
            title="Italic"
          >
            <ItalicIcon className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton
            active={!!fmt.underline}
            onClick={() =>
              onSetFieldFormat(fieldKey, {
                underline: fmt.underline ? undefined : true,
              })
            }
            title="Underline"
          >
            <UnderlineIcon className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarDivider />
          {currentFontId !== null && (
            <Select
              value={currentFontId}
              onValueChange={(id) =>
                onSetFieldFont(
                  fieldKey as keyof InvitationTexts,
                  id === "__default__" ? null : id
                )
              }
            >
              <SelectTrigger
                className="h-6 border-white/20 bg-white/10 text-white hover:bg-white/20"
                style={{ minWidth: "110px", fontSize: "11px" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">
                  {t("invitations.field_font_default")}
                </SelectItem>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.id} value={font.id}>
                    <span style={{ fontFamily: font.css }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={String(currentFontSize)}
            onValueChange={(v) =>
              onSetFieldFormat(fieldKey, {
                fontSize: v === "__auto__" ? undefined : Number(v),
              })
            }
          >
            <SelectTrigger
              className="h-6 border-white/20 bg-white/10 text-white hover:bg-white/20"
              style={{ minWidth: "56px", fontSize: "11px" }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">
                {t("invitations.field_size_auto")}
              </SelectItem>
              {[
                8, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 42, 48,
              ].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {isSep && currentSepStyle !== null && sepCfg !== null && (
        <>
          {/* Style picker */}
          {SEPARATOR_STYLE_OPTIONS.map((opt) => (
            <ToolbarButton
              key={opt.id}
              active={currentSepStyle === opt.id}
              onClick={() => onSetSeparatorStyle(selectedId, opt.id)}
              title={opt.id}
            >
              <span
                style={{ fontSize: "11px", lineHeight: 1, fontFamily: "serif" }}
              >
                {opt.ornament}
              </span>
            </ToolbarButton>
          ))}
          <ToolbarDivider />
          {/* Width slider — stopPropagation prevents toolbar's onMouseDown from intercepting */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "3px" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontSize: "9px",
                color: "rgba(255,255,255,0.4)",
                userSelect: "none",
              }}
            >
              W
            </span>
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={currentWidthPct}
              onChange={(e) =>
                onSetSeparatorConfig(selectedId, {
                  widthPct: Number(e.target.value),
                })
              }
              style={{
                width: "54px",
                accentColor: "rgba(255,255,255,0.8)",
                cursor: "pointer",
              }}
            />
            <span
              style={{
                fontSize: "9px",
                color: "rgba(255,255,255,0.4)",
                minWidth: "22px",
                userSelect: "none",
              }}
            >
              {currentWidthPct}%
            </span>
          </div>
          <ToolbarDivider />
          {/* Thickness presets */}
          {THICKNESS_OPTIONS.map(({ value, label }) => (
            <ToolbarButton
              key={value}
              active={currentThickness === value}
              onClick={() =>
                onSetSeparatorConfig(selectedId, { thicknessPx: value })
              }
              title={`${value}px`}
            >
              <span
                style={{
                  fontSize: value <= 1 ? "12px" : "14px",
                  lineHeight: 1,
                  fontWeight: value >= 4 ? 900 : 400,
                }}
              >
                {label}
              </span>
            </ToolbarButton>
          ))}
          <ToolbarDivider />
          {/* Remove */}
          <ToolbarButton
            onClick={() => {
              onRemoveSeparator(selectedId)
              onDeselect()
            }}
            title={t("invitations.separator_remove")}
          >
            <Trash2Icon className="h-3 w-3 text-red-400" />
          </ToolbarButton>
        </>
      )}
      <ToolbarDivider />
      <ToolbarButton
        onClick={onDeselect}
        title={t("invitations.toolbar_deselect")}
      >
        <XIcon className="h-3 w-3" />
      </ToolbarButton>
    </div>
  )
}

// --- ContextMenu ---

type ContextMenuState = {
  x: number // card-container px
  y: number
  cardX: number // card-space px (for free mode placement)
  cardY: number
  targetId: string | null
  side: InvitationSide
}

function ContextMenu({
  menu,
  snapEnabled,
  hiddenPredefinedFields,
  onAddSeparatorNear,
  onAddSeparatorAtPos,
  onAddTextBlockAt,
  onAddTextBlockNear,
  onMoveToSide,
  onDuplicate,
  onRemove,
  onRestoreField,
  onClose,
}: {
  menu: ContextMenuState
  snapEnabled: boolean
  hiddenPredefinedFields: Array<keyof InvitationTexts>
  onAddSeparatorNear: (nearId: string, pos: "before" | "after") => void
  onAddSeparatorAtPos: (
    side: InvitationSide,
    pos: { x: number; y: number }
  ) => void
  onAddTextBlockAt: (
    side: InvitationSide,
    pos: { x: number; y: number }
  ) => void
  onAddTextBlockNear: (nearId: string, pos: "before" | "after") => void
  onMoveToSide: (fieldId: string, side: InvitationSide) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onRestoreField: (id: keyof InvitationTexts, side: InvitationSide) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { targetId, side, x, y, cardX, cardY } = menu
  const isSep = targetId ? isSeparatorId(targetId) : false
  const isField = targetId ? isFieldKey(targetId) : false
  const isTxt = targetId ? isTxtId(targetId) : false
  const hasTarget = isSep || isField || isTxt
  const otherSide: InvitationSide = side === "front" ? "back" : "front"

  const MENU_W = 200
  const PREVIEW_W = 400
  const clampedX = Math.min(x, PREVIEW_W - MENU_W - 4)
  const clampedY = Math.max(4, y - 4)

  function item(label: string, action: () => void, danger = false) {
    return (
      <button
        key={label}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          action()
          onClose()
        }}
        className={cn(
          "w-full rounded px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/10",
          danger ? "text-red-400" : "text-white/90"
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: clampedY,
        left: clampedX,
        zIndex: 30,
        width: MENU_W,
        background: "rgba(12,12,12,0.95)",
        borderRadius: "8px",
        padding: "4px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* ── On object ── */}
      {hasTarget && targetId && (
        <>
          {snapEnabled &&
            item(t("invitations.context_add_above"), () =>
              onAddSeparatorNear(targetId, "before")
            )}
          {snapEnabled &&
            item(t("invitations.context_add_above_txt"), () =>
              onAddTextBlockNear(targetId, "before")
            )}
          {snapEnabled &&
            item(t("invitations.context_add_below"), () =>
              onAddSeparatorNear(targetId, "after")
            )}
          {snapEnabled &&
            item(t("invitations.context_add_below_txt"), () =>
              onAddTextBlockNear(targetId, "after")
            )}
          {(isField || isTxt) &&
            item(
              side === "front"
                ? t("invitations.context_move_to_back")
                : t("invitations.context_move_to_front"),
              () => onMoveToSide(targetId, otherSide)
            )}
          {item(t("invitations.context_duplicate"), () =>
            onDuplicate(targetId)
          )}
          {item(
            t("invitations.context_remove"),
            () => onRemove(targetId),
            true
          )}
        </>
      )}

      {/* ── On empty space ── */}
      {!hasTarget && (
        <>
          {!snapEnabled &&
            item(t("invitations.context_add_here"), () =>
              onAddSeparatorAtPos(side, {
                x: Math.round(cardX),
                y: Math.round(cardY),
              })
            )}
          {!snapEnabled &&
            item(t("invitations.context_add_textblock_here"), () =>
              onAddTextBlockAt(side, {
                x: Math.round(cardX),
                y: Math.round(cardY),
              })
            )}
          {snapEnabled &&
            item(
              side === "front"
                ? t("invitations.context_add_front")
                : t("invitations.context_add_back"),
              () => onAddSeparatorAtPos(side, { x: 0, y: 0 })
            )}
          {snapEnabled &&
            item(t("invitations.context_add_textblock"), () =>
              onAddTextBlockAt(side, { x: 0, y: 0 })
            )}
          {hiddenPredefinedFields.map((id) =>
            item(
              `${t("invitations.context_restore")}: ${t(FIELD_LABEL_KEYS[id])}`,
              () => onRestoreField(id, side)
            )
          )}
        </>
      )}
    </div>
  )
}

// Gap above/below the selected element before showing the toolbar
const TOOLBAR_GAP = 10
const TOOLBAR_H = 38

// --- Main Component ---

export function InvitationPreview() {
  const { t } = useTranslation()
  const design = useInvitationStore((s) => s.design)
  const reorderFields = useInvitationStore((s) => s.reorderFields)
  const setFieldPosition = useInvitationStore((s) => s.setFieldPosition)
  const updateTexts = useInvitationStore((s) => s.updateTexts)
  const removeSeparator = useInvitationStore((s) => s.removeSeparator)
  const setSeparatorStyle = useInvitationStore((s) => s.setSeparatorStyle)
  const setSeparatorConfig = useInvitationStore((s) => s.setSeparatorConfig)
  const addSeparatorNear = useInvitationStore((s) => s.addSeparatorNear)
  const addSeparatorAtPos = useInvitationStore((s) => s.addSeparatorAtPos)
  const moveFieldToSide = useInvitationStore((s) => s.moveFieldToSide)
  const addTextBlock = useInvitationStore((s) => s.addTextBlock)
  const addTextBlockNear = useInvitationStore((s) => s.addTextBlockNear)
  const removeTextBlock = useInvitationStore((s) => s.removeTextBlock)
  const updateTextBlock = useInvitationStore((s) => s.updateTextBlock)
  const duplicateField = useInvitationStore((s) => s.duplicateField)
  const setFieldFont = useInvitationStore((s) => s.setFieldFont)
  const setFieldFormat = useInvitationStore((s) => s.setFieldFormat)
  const undo = useInvitationStore((s) => s.undo)
  const redo = useInvitationStore((s) => s.redo)

  const guests = design.guestNames.length > 0 ? design.guestNames : undefined
  const Component = TEMPLATE_MAP[design.template]
  const fontCss = getFontCss(design.fontId)

  const [previewSide, setPreviewSide] = useState<InvitationSide>("front")
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [printAll, setPrintAll] = useState(false)
  const [_activeId, setActiveId] = useState<string | null>(null)
  const [activeOverlayContent, setActiveOverlayContent] =
    useState<React.ReactNode>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toolbarPos, setToolbarPos] = useState<{
    top: number
    left: number
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [clipboard, setClipboard] = useState<{
    key: keyof InvitationTexts
    text: string
    fontId?: string
  } | null>(null)

  const cardRef = useRef<HTMLDivElement | null>(null)
  const fieldEls = useRef<Map<string, Element>>(new Map())

  const PREVIEW_W = 400
  const scale = PREVIEW_W / CARD_W
  const scaledH = CARD_H * scale
  const colorTokens = COLOR_SCHEMES[design.colorScheme]

  // Toolbar position: placed outside overflow:hidden via wrapper sibling
  useEffect(() => {
    if (!selectedId || !cardRef.current) {
      setToolbarPos(null)
      return
    }
    const el = fieldEls.current.get(selectedId)
    if (!el) {
      setToolbarPos(null)
      return
    }
    const elRect = el.getBoundingClientRect()
    const cardRect = cardRef.current.getBoundingClientRect()
    const relTop = elRect.top - cardRect.top
    const relBottom = elRect.bottom - cardRect.top
    const relLeft = Math.max(
      70,
      Math.min(PREVIEW_W - 70, (elRect.left + elRect.right) / 2 - cardRect.left)
    )
    // Prefer above; fall back to below if element is near the top
    const top =
      relTop > TOOLBAR_H + TOOLBAR_GAP
        ? relTop - TOOLBAR_H - TOOLBAR_GAP
        : relBottom + TOOLBAR_GAP
    setToolbarPos({ top, left: relLeft })
  }, [selectedId])

  function commitEdit() {
    if (editingField === null) return
    if (isFieldKey(editingField)) {
      updateTexts({
        [editingField]: editingDraft.trim(),
      })
    } else if (isTxtId(editingField)) {
      updateTextBlock(editingField, editingDraft.trim())
    }
    setEditingField(null)
    setEditingDraft("")
  }
  function cancelEdit() {
    setEditingField(null)
    setEditingDraft("")
  }
  function deselect() {
    setSelectedId(null)
    setToolbarPos(null)
  }

  function handleSelect(id: string) {
    if (!isSeparatorId(id) && !isFieldKey(id) && !isTxtId(id)) return
    setSelectedId(id)
    setContextMenu(null)
  }

  function handleEdit(id: string) {
    if (isFieldKey(id)) {
      setSelectedId(id)
      setEditingField(id)
      setEditingDraft(design.texts[id])
    } else if (isTxtId(id)) {
      setSelectedId(id)
      setEditingField(id)
      setEditingDraft(design.textBlocks[id] ?? "")
    }
    setContextMenu(null)
  }

  function handleContext(id: string, e: React.MouseEvent) {
    if (!cardRef.current) return
    const cardRect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - cardRect.left
    const y = e.clientY - cardRect.top
    setContextMenu({
      x,
      y,
      cardX: x / scale,
      cardY: y / scale,
      targetId: id,
      side: design.fieldSides[id] ?? previewSide,
    })
    setSelectedId(id)
  }

  function handleCardContext(e: React.MouseEvent) {
    e.preventDefault()
    if (!cardRef.current) return
    const cardRect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - cardRect.left
    const y = e.clientY - cardRect.top
    setContextMenu({
      x,
      y,
      cardX: x / scale,
      cardY: y / scale,
      targetId: null,
      side: previewSide,
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (editingField !== null) return
      if (e.key === "Escape") {
        setContextMenu(null)
        deselect()
        return
      }
      const cmd = /Mac|iPhone|iPad/.test(navigator.platform)
        ? e.metaKey
        : e.ctrlKey
      if (cmd && !e.shiftKey && e.key === "z") {
        e.preventDefault()
        undo()
        return
      }
      if (cmd && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault()
        redo()
        return
      }
      if (cmd && e.key === "c" && selectedId && isFieldKey(selectedId)) {
        const key = selectedId
        setClipboard({
          key,
          text: design.texts[key],
          fontId: design.fieldFonts[key],
        })
        return
      }
      if (
        cmd &&
        e.key === "v" &&
        selectedId &&
        isFieldKey(selectedId) &&
        clipboard
      ) {
        const key = selectedId
        updateTexts({ [key]: clipboard.text })
        if (clipboard.fontId !== undefined) setFieldFont(key, clipboard.fontId)
        return
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        document.activeElement === document.body
      ) {
        if (isSeparatorId(selectedId)) removeSeparator(selectedId)
        else if (isTxtId(selectedId)) removeTextBlock(selectedId)
        else if (isFieldKey(selectedId)) moveFieldToSide(selectedId, "none")
        deselect()
        return
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    editingField,
    selectedId,
    clipboard,
    design.texts,
    design.fieldFonts,
    undo,
    redo,
    updateTexts,
    setFieldFont,
    removeSeparator,
    removeTextBlock,
    moveFieldToSide,
  ])

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

  const sharedProps = {
    colorScheme: design.colorScheme,
    fontCss,
    fieldFonts: design.fieldFonts,
    fieldFormats: design.fieldFormats,
    separatorStyles: design.separatorStyles,
    separatorConfigs: design.separatorConfigs,
    fieldSides: design.fieldSides,
    fieldOrder: design.fieldOrder,
    textBlocks: design.textBlocks,
  }

  const hiddenPredefinedFields = design.fieldOrder.filter(
    (id) => design.fieldSides[id] === "none" && isFieldKey(id)
  ) as Array<keyof InvitationTexts>

  const sideFields = design.fieldOrder.filter(
    (k) => design.fieldSides[k] === previewSide
  )

  function getDefaultFreePos(id: string) {
    const ownSide = design.fieldSides[id]
    const ownSideFields = design.fieldOrder.filter(
      (k) => design.fieldSides[k] === ownSide
    )
    return { x: 64, y: 100 + ownSideFields.indexOf(id) * 80 }
  }

  function handleSnapDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromInSide = sideFields.indexOf(active.id as string)
    const toInSide = sideFields.indexOf(over.id as string)
    if (fromInSide === -1 || toInSide === -1) return
    const reorderedSide = arrayMove(sideFields, fromInSide, toInSide)
    let sideIdx = 0
    reorderFields(
      design.fieldOrder.map((k) =>
        design.fieldSides[k] === previewSide ? reorderedSide[sideIdx++] : k
      )
    )
  }

  function handleDragStart(event: DragStartEvent) {
    if (!snapEnabled) return
    const id = event.active.id as string
    setActiveId(id)
    // For separators, show a full-card-width ghost so it's visible at scale
    if (isSeparatorId(id)) {
      setActiveOverlayContent(
        <div
          style={{
            width: `${CARD_W}px`,
            height: 1,
            backgroundColor: colorTokens.border,
            opacity: 0.7,
          }}
        />
      )
    } else {
      setActiveOverlayContent(
        (event.active.data.current?.overlay as React.ReactNode | undefined) ??
          null
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (snapEnabled) {
      handleSnapDragEnd(event)
    } else {
      const { active, delta } = event
      const id = active.id as string
      const pos = design.fieldPositions[id] ?? getDefaultFreePos(id)
      setFieldPosition(id, {
        x: isSeparatorId(id)
          ? 0
          : Math.round(Math.max(0, Math.min(CARD_W, pos.x + delta.x / scale))),
        y: Math.round(Math.max(0, Math.min(CARD_H, pos.y + delta.y / scale))),
      })
    }
    setActiveId(null)
    setActiveOverlayContent(null)
  }

  function handleDragCancel() {
    setActiveId(null)
    setActiveOverlayContent(null)
  }

  function makeEditOverlay(id: string): React.ReactNode {
    if (editingField !== id) return null
    if (!isFieldKey(id) && !isTxtId(id)) return null
    const maxLength = isFieldKey(id) ? TEXT_MAX_LENGTHS[id] : 500

    // Inherit typographic styles from the rendered content element so the
    // textarea looks identical to the field being edited (h1, p, etc.)
    const el = fieldEls.current.get(id)
    const contentEl = el?.querySelector<Element>("h1, h2, h3, p, span")
    let matchStyle: React.CSSProperties = {}
    if (contentEl) {
      const cs = window.getComputedStyle(contentEl)
      matchStyle = {
        marginTop: cs.marginTop,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily,
        fontStyle: cs.fontStyle,
        letterSpacing: cs.letterSpacing,
        lineHeight: cs.lineHeight,
        textAlign: cs.textAlign as React.CSSProperties["textAlign"],
        color: cs.color,
        textTransform: cs.textTransform as React.CSSProperties["textTransform"],
        textDecoration: cs.textDecoration,
      }
    }

    return (
      <InlineTextarea
        maxLength={maxLength}
        draft={editingDraft}
        onDraftChange={setEditingDraft}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        matchStyle={matchStyle}
      />
    )
  }

  function makeRefCapture(id: string) {
    return (el: Element | null) => {
      if (el) fieldEls.current.set(id, el)
      else fieldEls.current.delete(id)
    }
  }

  const commonItemProps = (id: string) => ({
    isSelected: selectedId === id,
    isEditing: editingField === id,
    isSeparator: isSeparatorId(id),
    onSelect: handleSelect,
    onEdit: handleEdit,
    onContext: handleContext,
    editOverlay: makeEditOverlay(id),
    onRefCapture: makeRefCapture(id),
  })

  function wrapFieldSnap(id: string, content: React.ReactNode) {
    return (
      <SortableItem key={id} id={id} scale={scale} {...commonItemProps(id)}>
        {content}
      </SortableItem>
    )
  }

  function wrapFieldFree(id: string, content: React.ReactNode) {
    const pos = design.fieldPositions[id] ?? getDefaultFreePos(id)
    return (
      <FreeDraggableField
        key={id}
        id={id}
        pos={pos}
        scale={scale}
        {...commonItemProps(id)}
      >
        {content}
      </FreeDraggableField>
    )
  }

  function wrapFieldPrint(id: string, content: React.ReactNode) {
    const pos = design.fieldPositions[id] ?? getDefaultFreePos(id)
    const isSep = isSeparatorId(id)
    return (
      <div
        key={id}
        style={{
          position: "absolute",
          left: isSep ? 0 : pos.x,
          top: pos.y,
          ...(isSep && { width: CARD_W }),
        }}
      >
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

  return (
    <div className="flex flex-col gap-4">
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={snapEnabled ? undefined : [restrictToCard]}
      >
        {/*
          Wrapper has position:relative so toolbar/context-menu are positioned
          relative to it, but it has NO overflow:hidden so they're never clipped.
          The inner card div keeps overflow:hidden for the card visuals only.
        */}
        <div
          style={{
            position: "relative",
            width: PREVIEW_W,
            height: scaledH,
            flexShrink: 0,
          }}
        >
          <div
            ref={cardRef}
            className="overflow-hidden rounded-lg border shadow-sm"
            style={{ width: PREVIEW_W, height: scaledH }}
            onClick={() => {
              deselect()
              cancelEdit()
              setContextMenu(null)
            }}
            onContextMenu={handleCardContext}
          >
            {snapEnabled ? (
              <SortableContext
                items={sideFields}
                strategy={verticalListSortingStrategy}
              >
                <div style={scaledCardStyle}>
                  <Component
                    texts={design.texts}
                    side={previewSide}
                    wrapField={wrapFieldSnap}
                    {...sharedProps}
                  />
                </div>
              </SortableContext>
            ) : (
              <div style={scaledCardStyle}>
                <Component
                  texts={design.texts}
                  side={previewSide}
                  wrapField={wrapFieldFree}
                  {...sharedProps}
                />
              </div>
            )}

            {/* Front / Back toggle */}
            <div className="absolute top-2 left-2 flex overflow-hidden rounded-md border border-white/20 shadow-md">
              {(["front", "back"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewSide(s)
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold transition-colors",
                    previewSide === s
                      ? "bg-black/60 text-white"
                      : "bg-black/20 text-white/70 hover:bg-black/40 hover:text-white"
                  )}
                >
                  {s === "front"
                    ? t("invitations.side_front")
                    : t("invitations.side_back")}
                </button>
              ))}
            </div>

            {/* Snap / Free toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSnapEnabled((v) => !v)
              }}
              title={
                snapEnabled
                  ? t("invitations.snap_on")
                  : t("invitations.snap_off")
              }
              className={cn(
                "absolute top-2 right-2 flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs font-semibold shadow-md transition-colors",
                snapEnabled
                  ? "bg-black/60 text-white"
                  : "bg-black/20 text-white/70 hover:bg-black/40 hover:text-white"
              )}
            >
              <MoveIcon className="h-3 w-3" />
              {snapEnabled
                ? t("invitations.snap_on")
                : t("invitations.snap_off")}
            </button>
          </div>

          {/* Toolbar and context menu live outside overflow:hidden */}
          <FloatingToolbar
            selectedId={selectedId}
            pos={toolbarPos}
            fieldFonts={design.fieldFonts}
            fieldFormats={design.fieldFormats}
            separatorStyles={design.separatorStyles}
            separatorConfigs={design.separatorConfigs}
            onSetFieldFont={setFieldFont}
            onSetFieldFormat={setFieldFormat}
            onSetSeparatorStyle={setSeparatorStyle}
            onSetSeparatorConfig={setSeparatorConfig}
            onRemoveSeparator={removeSeparator}
            onDeselect={deselect}
          />
          {contextMenu && (
            <ContextMenu
              menu={contextMenu}
              snapEnabled={snapEnabled}
              hiddenPredefinedFields={hiddenPredefinedFields}
              onAddSeparatorNear={addSeparatorNear}
              onAddSeparatorAtPos={addSeparatorAtPos}
              onAddTextBlockAt={(side, pos) => {
                const id = makeTxtId()
                addTextBlock(id, side, pos)
                handleEdit(id)
              }}
              onAddTextBlockNear={(nearId, pos) => {
                const id = makeTxtId()
                addTextBlockNear(id, nearId, pos)
                handleEdit(id)
              }}
              onMoveToSide={moveFieldToSide}
              onDuplicate={duplicateField}
              onRemove={(id) => {
                if (isSeparatorId(id)) removeSeparator(id)
                else if (isTxtId(id)) removeTextBlock(id)
                else if (isFieldKey(id)) moveFieldToSide(id, "none")
                deselect()
              }}
              onRestoreField={(id, side) => moveFieldToSide(id, side)}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {snapEnabled && activeOverlayContent ? (
            // Always render overlay at full card width so fields get the same
            // flex/width context as on the card — prevents style shifts during drag.
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: `${CARD_W}px`,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                fontFamily: fontCss,
                color: colorTokens.text,
                userSelect: "none",
                touchAction: "none",
              }}
            >
              {activeOverlayContent}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
