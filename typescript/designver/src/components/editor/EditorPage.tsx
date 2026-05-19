import { useEffect, useState } from 'react'
import { Printer, Users, Grid, Undo2, Redo2 } from 'lucide-react'
import { useDesignStore } from '#/stores/design.store'
import { COLOR_SCHEMES } from '#/lib/invitation/colorSchemes'
import { FONT_OPTIONS } from '#/lib/invitation/fonts'
import { Canvas } from '#/components/editor/Canvas'
import { GuestSidebar } from '#/components/editor/GuestSidebar'
import { ShareButton } from '#/components/editor/ShareButton'
import { PrintPreview } from '#/components/editor/PrintPreview'
import { Button } from '#/components/ui/button'
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
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'

export function EditorPage() {
  const [showPrint, setShowPrint] = useState(false)

  const design = useDesignStore((s) => s.design)
  const gridEnabled = useDesignStore((s) => s.gridEnabled)
  const history = useDesignStore((s) => s.history)
  const toggleGrid = useDesignStore((s) => s.toggleGrid)
  const setColorScheme = useDesignStore((s) => s.setColorScheme)
  const setDefaultFont = useDesignStore((s) => s.setDefaultFont)
  const toggleGuestSidebar = useDesignStore((s) => s.toggleGuestSidebar)
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <TooltipProvider>
      <div className="editor-page flex h-screen flex-col overflow-hidden bg-background">
        {/* Top bar */}
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-card px-3 shadow-sm">
          {/* Left: logo + undo/redo + style controls */}
          <div className="flex items-center gap-2" data-testid="header-left">
            <a
              href="/"
              className="mr-2 text-sm font-semibold tracking-tight text-foreground"
            >
              designver
            </a>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={history.past.length === 0}
                  onClick={undo}
                >
                  <Undo2 size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={history.future.length === 0}
                  onClick={redo}
                >
                  <Redo2 size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>

            <div className="mx-2 h-5 w-px bg-border" />

            {/* Color scheme */}
            <Select value={design.colorScheme} onValueChange={setColorScheme}>
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COLOR_SCHEMES).map(([id, tokens]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-3 w-3 rounded-full border"
                        style={{
                          background: tokens.bg,
                          borderColor: tokens.border,
                        }}
                      />
                      {id}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Default font */}
            <Select value={design.defaultFontId} onValueChange={setDefaultFont}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
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

            {/* Grid toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={gridEnabled ? 'default' : 'ghost'}
                  className="h-7 w-7 p-0"
                  aria-label="Toggle grid"
                  onClick={toggleGrid}
                >
                  <Grid size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle grid (snap fields to grid)</TooltipContent>
            </Tooltip>
          </div>

          {/* Right: guests + share + print */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-3 text-sm"
              onClick={toggleGuestSidebar}
              data-testid="guest-sidebar-toggle"
            >
              <Users size={14} />
              Guests
            </Button>
            <ShareButton />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-3 text-sm"
              onClick={() => setShowPrint(true)}
            >
              <Printer size={14} />
              Print
            </Button>
          </div>
        </header>

        {/* Canvas */}
        <Canvas />

        {/* Sidebars */}
        <GuestSidebar />

        {/* Print preview */}
        {showPrint && <PrintPreview onClose={() => setShowPrint(false)} />}
      </div>
    </TooltipProvider>
  )
}
