import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import type { Field } from '#/lib/invitation/types'
import { FONT_OPTIONS } from '#/lib/invitation/fonts'
import { SEPARATOR_STYLE_OPTIONS } from '#/lib/invitation/defaults'
import { useDesignStore } from '#/stores/design.store'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Slider } from '#/components/ui/slider'
import { IconDisplay } from '#/components/editor/IconDisplay'
import { IconPicker } from '#/components/editor/IconPicker'

const FONT_SIZES = [
  8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96, 120,
]

interface FloatingToolbarProps {
  field: Field
  cardRef: React.RefObject<HTMLDivElement | null>
  scale: number
}

export function FloatingToolbar({
  field,
  cardRef,
  scale,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  const activePart = useDesignStore((s) => s.activePart)
  const removeField = useDesignStore((s) => s.removeField)
  const updateField = useDesignStore((s) => s.updateField)

  // Recompute position when field geometry or scale changes
  useEffect(() => {
    const card = cardRef.current
    const toolbar = toolbarRef.current
    if (!card || !toolbar) return

    const cardRect = card.getBoundingClientRect()
    const tbH = toolbar.getBoundingClientRect().height || 44

    const fieldTop = cardRect.top + field.geom.y * scale
    const fieldLeft = cardRect.left + field.geom.x * scale
    const fieldWidth = field.geom.w * scale

    const top =
      fieldTop > tbH + 8
        ? fieldTop - tbH - 8
        : cardRect.top + (field.geom.y + field.geom.h) * scale + 8

    const left = fieldLeft + fieldWidth / 2

    setPos({
      top: top - cardRect.top + card.offsetTop,
      left: left - cardRect.left + card.offsetLeft,
    })
  }, [field.geom, scale, cardRef])

  function patchText(patch: object) {
    if (field.type !== 'text') return
    updateField(activePart, field.id, {
      format: { ...(field.format ?? {}), ...patch },
    })
  }

  const fmt = field.type === 'text' ? (field.format ?? {}) : {}

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 shadow-xl"
      style={{
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        pointerEvents: 'all',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {field.type === 'text' && (
        <>
          {/* B I U */}
          <Button
            size="sm"
            variant={fmt.bold ? 'default' : 'ghost'}
            className="h-7 w-7 p-0"
            onClick={() => patchText({ bold: !fmt.bold })}
          >
            <Bold size={14} />
          </Button>
          <Button
            size="sm"
            variant={fmt.italic ? 'default' : 'ghost'}
            className="h-7 w-7 p-0"
            onClick={() => patchText({ italic: !fmt.italic })}
          >
            <Italic size={14} />
          </Button>
          <Button
            size="sm"
            variant={fmt.underline ? 'default' : 'ghost'}
            className="h-7 w-7 p-0"
            onClick={() => patchText({ underline: !fmt.underline })}
          >
            <Underline size={14} />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />

          {/* Font family */}
          <Select
            value={fmt.fontId ?? ''}
            onValueChange={(v) => patchText({ fontId: v || undefined })}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem
                  key={f.id}
                  value={f.id}
                  style={{ fontFamily: f.css }}
                >
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font size */}
          <Select
            value={fmt.fontSize?.toString() ?? ''}
            onValueChange={(v) => {
              const fs = parseInt(v)
              if (!isNaN(fs)) patchText({ fontSize: fs })
            }}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s} value={s.toString()}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font weight */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">W</span>
            <Slider
              className="w-20"
              min={100}
              max={900}
              step={100}
              value={[fmt.fontWeight ?? 400]}
              onValueChange={([v]) => patchText({ fontWeight: v })}
            />
          </div>

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Alignment */}
          {(['left', 'center', 'right'] as const).map((align) => {
            const Icon =
              align === 'left'
                ? AlignLeft
                : align === 'center'
                  ? AlignCenter
                  : AlignRight
            return (
              <Button
                key={align}
                size="sm"
                variant={fmt.textAlign === align ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => patchText({ textAlign: align })}
              >
                <Icon size={14} />
              </Button>
            )
          })}
        </>
      )}

      {field.type === 'separator' && (
        <>
          {/* Separator style */}
          {SEPARATOR_STYLE_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              size="sm"
              variant={field.style === opt.id ? 'default' : 'ghost'}
              className="h-7 px-2 text-sm"
              onClick={() =>
                updateField(activePart, field.id, {
                  style: opt.id,
                })
              }
            >
              {opt.ornament}
            </Button>
          ))}
          <div className="mx-1 h-5 w-px bg-border" />
          {/* Thickness */}
          {([0.5, 1, 2, 3] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={field.thickness === t ? 'default' : 'ghost'}
              className="h-7 w-9 text-xs p-0"
              onClick={() =>
                updateField(activePart, field.id, {
                  thickness: t,
                })
              }
            >
              {t}px
            </Button>
          ))}
        </>
      )}

      {field.type === 'icon' && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setIconPickerOpen(true)}
          >
            <IconDisplay iconKey={field.iconKey} size={14} />
            Change
          </Button>
          {iconPickerOpen && (
            <IconPicker
              onSelect={(key) => {
                updateField(activePart, field.id, {
                  iconKey: key,
                })
                setIconPickerOpen(false)
              }}
              onClose={() => setIconPickerOpen(false)}
            />
          )}
        </>
      )}

      <div className="mx-1 h-5 w-px bg-border" />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
        onClick={() => removeField(activePart, field.id)}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}
