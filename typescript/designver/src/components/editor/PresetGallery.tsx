import { PlusCircle } from 'lucide-react'
import { PRESETS } from '#/lib/invitation/presets'
import { encodeDesign } from '#/lib/invitation/hash'
import { getColorScheme } from '#/lib/invitation/colorSchemes'
import { FieldRenderer } from '#/components/editor/FieldRenderer'
import { PART_DIMENSIONS } from '#/lib/invitation/defaults'
import '#/lib/invitation/fonts'

const THUMB_SCALE = 0.22

export function PresetGallery() {
  return (
    <main className="page-wrap px-4 pb-16 pt-12">
      <h1 className="display-title mb-2 text-3xl font-bold text-[var(--sea-ink)]">
        Invitation Designer
      </h1>
      <p className="mb-10 text-[var(--sea-ink-soft)]">
        Start from a preset or build from a blank canvas.
      </p>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {/* Blank */}
        <a
          href="/editor"
          aria-label="Blank canvas"
          className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 p-4 no-underline transition hover:border-gray-400 hover:bg-gray-50"
        >
          <div
            className="flex items-center justify-center rounded-xl bg-gray-100"
            style={{
              width: PART_DIMENSIONS.invitation.w * THUMB_SCALE,
              height: PART_DIMENSIONS.invitation.h * THUMB_SCALE,
            }}
          >
            <PlusCircle
              size={32}
              className="text-gray-400 group-hover:text-gray-600"
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            Blank canvas
          </span>
        </a>

        {PRESETS.map((preset) => {
          const encoded = encodeDesign(preset.design)
          const dims = PART_DIMENSIONS.invitation
          const colors = getColorScheme(preset.colorScheme)
          const frontFields = preset.design.parts.invitation.front

          return (
            <a
              key={preset.id}
              href={`/editor#${encoded}`}
              aria-label={preset.label}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 p-4 no-underline transition hover:border-gray-300 hover:shadow-md"
            >
              {/* Thumbnail */}
              <div
                className="relative overflow-hidden rounded-lg shadow-sm"
                style={{
                  width: dims.w * THUMB_SCALE,
                  height: dims.h * THUMB_SCALE,
                }}
              >
                <div
                  style={{
                    width: dims.w,
                    height: dims.h,
                    background: colors.bg,
                    transform: `scale(${THUMB_SCALE})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  {frontFields.map((field) => (
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
                        colorScheme={preset.colorScheme}
                        defaultFontId={preset.design.defaultFontId}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {preset.label}
                </p>
                <p className="text-xs text-gray-400">{preset.description}</p>
              </div>
            </a>
          )
        })}
      </div>
    </main>
  )
}
