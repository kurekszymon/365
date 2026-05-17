import { useEffect, useRef } from 'react'
import type { TextField } from '#/lib/invitation/types'
import { buildTextStyle } from '#/components/editor/FieldRenderer'

interface InlineTextEditorProps {
  field: TextField
  colorScheme: string
  defaultFontId: string
  onCommit: (content: string) => void
  onCancel: () => void
}

export function InlineTextEditor({
  field,
  colorScheme,
  defaultFontId,
  onCommit,
  onCancel,
}: InlineTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
    adjustHeight(el)
  }, [])

  function adjustHeight(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const textStyle = buildTextStyle(field.format, defaultFontId, colorScheme)

  return (
    <textarea
      ref={ref}
      defaultValue={field.content}
      style={{
        ...textStyle,
        position: 'absolute',
        inset: 0,
        resize: 'none',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        overflow: 'hidden',
        pointerEvents: 'all',
        userSelect: 'text',
        cursor: 'text',
        zIndex: 20,
        // Undo scale so the textarea appears at normal size within the scaled canvas
        transformOrigin: 'top left',
      }}
      onInput={(e) => adjustHeight(e.currentTarget)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          onCancel()
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onCommit(e.currentTarget.value)
        }
      }}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onPointerDown={(e) => e.stopPropagation()}
    />
  )
}
