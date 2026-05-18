import type { Design, PartId } from '#/lib/invitation/types'
import { PART_DIMENSIONS } from '#/lib/invitation/defaults'
import { getColorScheme } from '#/lib/invitation/colorSchemes'
import { FieldRenderer } from '#/components/editor/FieldRenderer'

const GHOST_WIDTH = 110

interface GhostCardProps {
  partId: PartId
  label: string
  design: Design
  activePart: PartId
  onActivate: () => void
  onToggle?: () => void
}

export const GhostCard = ({
  partId,
  label,
  design,
  activePart,
  onActivate,
  onToggle,
}: GhostCardProps) => {
  const dims = PART_DIMENSIONS[partId]
  const ghostScale = GHOST_WIDTH / dims.w
  const ghostHeight = dims.h * ghostScale
  const colors = getColorScheme(design.colorScheme)
  const enabled =
    partId === 'invitation' ? true : design.enabledParts[partId]
  const isActive = activePart === partId

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          width: GHOST_WIDTH,
          height: ghostHeight,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          background: colors.bg,
          opacity: enabled ? 1 : 0.25,
          cursor: enabled ? 'pointer' : 'default',
          boxShadow: isActive
            ? '0 0 0 2px #3b82f6, 0 1px 6px rgba(0,0,0,0.12)'
            : '0 1px 4px rgba(0,0,0,0.14)',
          flexShrink: 0,
        }}
        onClick={() => enabled && onActivate()}
        title={enabled ? `Edit ${label}` : `${label} disabled`}
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
                colorScheme={design.colorScheme}
                defaultFontId={design.defaultFontId}
                isEditing={false}
              />
            </div>
          ))}
        </div>
      </div>

      {onToggle ? (
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="h-3 w-3 rounded accent-blue-500"
          />
          {label}
        </label>
      ) : (
        <span className="select-none text-xs text-gray-500">{label}</span>
      )}
    </div>
  )
}
