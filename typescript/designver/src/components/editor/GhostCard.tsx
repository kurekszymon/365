import type { Design, PartId } from '#/lib/invitation/types'
import { PART_DIMENSIONS } from '#/lib/invitation/defaults'
import { COLOR_SCHEMES, getColorScheme } from '#/lib/invitation/colorSchemes'
import { FieldRenderer } from '#/components/editor/FieldRenderer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

const GHOST_WIDTH = 110

const PART_TOOLTIP: Record<PartId, string> = {
  invitation: 'Main invitation card',
  extra: 'Extra insert (e.g. RSVP, directions)',
  envelope: 'Envelope — fold lines show where the paper creases',
}

interface GhostCardProps {
  partId: PartId
  label: string
  design: Design
  activePart: PartId
  onActivate: () => void
  onToggle?: () => void
  onSetColorScheme?: (schemeId: string | null) => void
}

export const GhostCard = ({
  partId,
  label,
  design,
  activePart,
  onActivate,
  onToggle,
  onSetColorScheme,
}: GhostCardProps) => {
  const dims = PART_DIMENSIONS[partId]
  const ghostScale = GHOST_WIDTH / dims.w
  const ghostHeight = dims.h * ghostScale
  const colors = getColorScheme(design.colorScheme)
  const overrideSchemeId =
    design.partColorSchemes?.[partId as 'extra' | 'envelope']
  const bg = overrideSchemeId ? getColorScheme(overrideSchemeId).bg : colors.bg
  const enabled = partId === 'invitation' || design.enabledParts[partId]
  const isActive = activePart === partId

  return (
    <div
      data-testid={`ghost-card-${partId}`}
      className="flex flex-col items-center gap-2"
    >
      {/* Tooltip wraps only the card preview — keeps it isolated from the Select below */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-scheme={overrideSchemeId ?? design.colorScheme}
            style={{
              width: GHOST_WIDTH,
              height: ghostHeight,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 4,
              background: bg,
              opacity: enabled ? 1 : 0.25,
              cursor: enabled ? 'pointer' : 'default',
              boxShadow: isActive
                ? '0 0 0 2px var(--ring), 0 1px 6px rgba(0,0,0,0.12)'
                : '0 1px 4px rgba(0,0,0,0.14)',
              flexShrink: 0,
            }}
            onClick={() => enabled && onActivate()}
          >
            <div
              style={{
                transform: `scale(${ghostScale})`,
                transformOrigin: 'top left',
                width: dims.w,
                height: dims.h,
                pointerEvents: 'none',
              }}
            >
              {design.parts[partId].front.map((field) => (
                <div
                  key={field.id}
                  style={{
                    position: 'absolute',
                    left: field.geom.x,
                    top: field.geom.y,
                    width: field.geom.w,
                    height: field.geom.h,
                  }}
                >
                  <FieldRenderer
                    field={field}
                    colorScheme={overrideSchemeId ?? design.colorScheme}
                    defaultFontId={design.defaultFontId}
                    isEditing={false}
                  />
                </div>
              ))}
            </div>

            {partId === 'envelope' && (
              <svg
                data-testid="ghost-envelope-fold"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
                viewBox={`0 0 ${dims.w} ${dims.h}`}
                preserveAspectRatio="none"
              >
                <polyline
                  points={`0,0 ${dims.w / 2},${dims.h * 0.38} ${dims.w},0`}
                  fill="none"
                  stroke={colors.border}
                  strokeWidth={1 / ghostScale}
                  strokeDasharray={`${3 / ghostScale},${3 / ghostScale}`}
                  opacity="0.5"
                />
              </svg>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">{PART_TOOLTIP[partId]}</TooltipContent>
      </Tooltip>

      {onToggle ? (
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="h-3 w-3 rounded accent-blue-500"
          />
          {label}
        </label>
      ) : (
        <span className="select-none text-xs text-muted-foreground">
          {label}
        </span>
      )}

      {onSetColorScheme && enabled && (
        <Select
          value={overrideSchemeId ?? '__default__'}
          onValueChange={(v) =>
            onSetColorScheme(v === '__default__' ? null : v)
          }
        >
          <SelectTrigger
            className="h-6 w-full gap-1 px-1.5 text-xs"
            data-testid={`bg-picker-${partId}`}
          >
            <div
              className="h-3 w-3 flex-shrink-0 rounded-full border"
              style={{ background: bg, borderColor: colors.border }}
            />
            <SelectValue placeholder="default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Default (scheme)</SelectItem>
            {Object.entries(COLOR_SCHEMES).map(([id, t]) => (
              <SelectItem key={id} value={id}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full border"
                    style={{ background: t.bg, borderColor: t.border }}
                  />
                  {id}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
