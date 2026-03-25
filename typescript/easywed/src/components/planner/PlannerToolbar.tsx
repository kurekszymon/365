import { useRef } from "react"
import {
  LayoutList,
  Map,
  PlusCircle,
  Users,
  Plus,
  Download,
  Upload,
  FileJson,
  Printer,
  Landmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PlannerState } from "@/lib/planner/types"
import { exportAsJSON, importFromJSON } from "@/lib/planner/storage"

interface Props {
  view: "canvas" | "list"
  onToggleView: () => void
  onAddTable: () => void
  onAddGuest: () => void
  onOpenGuestPanel: () => void
  onConfigureHall: () => void
  state: PlannerState
  onImport: (state: PlannerState) => void
  weddingName: string
  onEditName: () => void
}

export function PlannerToolbar({
  view,
  onToggleView,
  onAddTable,
  onAddGuest,
  onOpenGuestPanel,
  onConfigureHall,
  state,
  onImport,
  weddingName,
  onEditName,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    importFromJSON(file)
      .then(onImport)
      .catch(() =>
        alert(
          "Could not import file. Make sure it's a valid .easywed.json file."
        )
      )
    e.target.value = ""
  }

  function handlePrint() {
    window.print()
  }

  const assigned = state.guests.filter((g) => g.tableId !== null).length

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2 print:hidden">
      {/* Left: wedding name + stats */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="max-w-[140px] truncate text-sm font-semibold underline-offset-2 hover:underline sm:max-w-none"
          onClick={onEditName}
          title="Click to rename"
        >
          {weddingName}
        </button>
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
          {state.tables.length} tables · {assigned}/{state.guests.length} seated
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant={state.hall ? "secondary" : "outline"}
          onClick={onConfigureHall}
          className="gap-1.5"
          title="Configure wedding hall"
        >
          <Landmark className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Hall</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onAddTable}
          className="gap-1.5"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Table</span>
        </Button>
        {/* Guests split button: left opens panel, right adds guest directly */}
        <div className="flex items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenGuestPanel}
            className="gap-1.5 rounded-r-none border-r-0"
            title="Open guests panel"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              Guests
              {state.guests.length > 0 && ` (${state.guests.length})`}
            </span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onAddGuest}
            className="rounded-l-none px-2"
            title="Add guest"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* View toggle */}
        <Button
          size="icon-sm"
          variant={view === "canvas" ? "secondary" : "ghost"}
          onClick={onToggleView}
          title={
            view === "canvas" ? "Switch to list view" : "Switch to canvas view"
          }
        >
          {view === "canvas" ? (
            <LayoutList className="h-4 w-4" />
          ) : (
            <Map className="h-4 w-4" />
          )}
        </Button>

        {/* Export / Import */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" title="Export / Import">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handlePrint} className="gap-2">
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportAsJSON(state)}
              className="gap-2"
            >
              <FileJson className="h-3.5 w-3.5" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              Import JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.easywed.json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </div>
  )
}
