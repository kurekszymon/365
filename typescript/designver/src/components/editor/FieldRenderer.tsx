import type { Field, FieldFormat } from '#/lib/invitation/types'
import { SEPARATOR_STYLE_OPTIONS } from '#/lib/invitation/defaults'
import { getFontCss, DEFAULT_FONT_CSS } from '#/lib/invitation/fonts'
import { getColorScheme } from '#/lib/invitation/colorSchemes'
import { IconDisplay } from '#/components/editor/IconDisplay'

interface FieldRendererProps {
  field: Field
  colorScheme: string
  defaultFontId: string
  isEditing?: boolean
}

function buildTextStyle(
  format: FieldFormat | undefined,
  defaultFontId: string,
  colorScheme: string,
): React.CSSProperties {
  const colors = getColorScheme(colorScheme)
  return {
    fontFamily: format?.fontId
      ? getFontCss(format.fontId)
      : getFontCss(defaultFontId) || DEFAULT_FONT_CSS,
    fontSize: format?.fontSize ? `${format.fontSize}px` : '16px',
    fontWeight: format?.fontWeight ?? (format?.bold ? 700 : 400),
    fontStyle: format?.italic ? 'italic' : 'normal',
    textDecoration: format?.underline ? 'underline' : 'none',
    textAlign: format?.textAlign ?? 'center',
    color: format?.color ?? colors.text,
    lineHeight: 1.35,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    width: '100%',
    height: '100%',
    margin: 0,
    padding: '2px 4px',
    boxSizing: 'border-box' as const,
    pointerEvents: 'none',
    userSelect: 'none' as const,
  }
}

export function FieldRenderer({
  field,
  colorScheme,
  defaultFontId,
  isEditing,
}: FieldRendererProps) {
  if (field.type === 'text') {
    return (
      <p
        data-field-id={field.id}
        data-field-type="text"
        style={{
          ...buildTextStyle(field.format, defaultFontId, colorScheme),
          opacity: isEditing ? 0 : 1,
        }}
      >
        {field.content || (
          <span style={{ opacity: 0.35 }}>Double-click to edit</span>
        )}
      </p>
    )
  }

  if (field.type === 'separator') {
    const colors = getColorScheme(colorScheme)
    const option = SEPARATOR_STYLE_OPTIONS.find((o) => o.id === field.style)
    const ornament = option?.ornament ?? '—'
    const isLine = field.style === 'line'
    return (
      <div
        data-field-id={field.id}
        data-field-type="separator"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.border,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {isLine ? (
          <div
            style={{
              width: '80%',
              height: `${field.thickness}px`,
              backgroundColor: colors.border,
            }}
          />
        ) : (
          <span
            style={{
              fontSize: Math.max(12, field.geom.h * 0.6),
              letterSpacing: '0.3em',
            }}
          >
            {ornament}
          </span>
        )}
      </div>
    )
  }

  const colors = getColorScheme(colorScheme)
  return (
    <div
      data-field-id={field.id}
      data-field-type="icon"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <IconDisplay
        iconKey={field.iconKey}
        color={field.color ?? colors.accent}
        size={Math.min(field.geom.w, field.geom.h) * 0.8}
      />
    </div>
  )
}

export { buildTextStyle }
