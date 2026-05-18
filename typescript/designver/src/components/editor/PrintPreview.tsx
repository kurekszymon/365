import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useDesignStore } from '#/stores/design.store'
import { PART_DIMENSIONS } from '#/lib/invitation/defaults'
import { FieldRenderer } from '#/components/editor/FieldRenderer'
import { Button } from '#/components/ui/button'
import type { PartId, Side } from '#/lib/invitation/types'

interface PrintPreviewProps {
  onClose: () => void
}

const ALL_PARTS: PartId[] = ['invitation', 'extra', 'envelope']
const SIDES: Side[] = ['front', 'back']

export function PrintPreview({ onClose }: PrintPreviewProps) {
  const design = useDesignStore((s) => s.design)
  const guests = useDesignStore((s) => s.guests)

  const guestList = guests.length > 0 ? guests : ['']
  const enabledParts = design.enabledParts ?? { extra: true, envelope: true }
  const PARTS = ALL_PARTS.filter(
    (part) => part === 'invitation' || enabledParts[part],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const content = (
    <div className="print-preview fixed inset-0 z-[200] flex flex-col bg-gray-200 print:bg-white">
      {/* Toolbar — hidden in print */}
      <div className="no-print flex items-center justify-between bg-white px-4 py-2 shadow-sm">
        <span className="text-sm font-medium text-gray-700">
          Print Preview — {guestList.length}{' '}
          {guestList.length === 1 ? 'guest' : 'guests'} × {PARTS.length} parts ×
          2 sides
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer size={14} /> Print
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-y-auto p-8 print:overflow-visible print:p-0">
        {guestList.map((guest, gIdx) =>
          PARTS.map((partId) =>
            SIDES.map((side) => {
              const fields = design.parts[partId][side]
              if (fields.length === 0) return null
              const dims = PART_DIMENSIONS[partId]
              return (
                <div
                  key={`${gIdx}-${partId}-${side}`}
                  className="print-page relative mx-auto mb-8 bg-white shadow-lg print:mb-0 print:shadow-none"
                  style={{
                    width: dims.w,
                    height: dims.h,
                    pageBreakAfter: 'always',
                  }}
                >
                  {fields.map((field) => (
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
                      />
                    </div>
                  ))}
                  {/* Guest name label for identification in screen view */}
                  {guest && (
                    <div className="no-print absolute bottom-1 right-2 text-[10px] text-gray-300">
                      {guest} · {partId} {side}
                    </div>
                  )}
                </div>
              )
            }),
          ),
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { page-break-after: always; margin: 0; }
          @page { margin: 0; }
        }
      `}</style>
    </div>
  )

  return createPortal(content, document.body)
}
