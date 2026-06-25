import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

type FileDropZoneProps = {
  /** Value for the input's `accept` attribute, e.g. ".dxf" or ".csv,.xlsx". */
  accept: string
  /**
   * Allowed extensions (lowercase, with dot) used to validate a dropped file —
   * the native file picker already enforces `accept`, but drag-and-drop does
   * not, so we re-check here. If omitted, any dropped file is accepted.
   */
  extensions?: Array<string>
  /** Main call-to-action text shown inside the drop area. */
  label: string
  /** Secondary hint text (e.g. "or click to browse"). */
  hint: string
  /** Called with the chosen file (from click-to-browse or a valid drop). */
  onFile: (file: File) => void
  /** Called when a dropped file's extension isn't in `extensions`. */
  onInvalidFile?: () => void
}

export const FileDropZone = ({
  accept,
  extensions,
  label,
  hint,
  onFile,
  onInvalidFile,
}: FileDropZoneProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const isAllowed = (file: File) =>
    !extensions ||
    extensions.some((ext) => file.name.toLowerCase().endsWith(ext))

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length === 0) return
    const file = e.dataTransfer.files[0]
    if (!isAllowed(file)) {
      onInvalidFile?.()
      return
    }
    onFile(file)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Clear the value so picking the same file again still fires onChange
          // — otherwise the "Try again" loop is flaky after an error.
          e.target.value = ""
          if (file) onFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/40 hover:border-primary/50"
        )}
      >
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>
    </>
  )
}
