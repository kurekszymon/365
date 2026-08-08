import { useState } from "react"
import type { ColumnMapping, GuestImportField } from "@/lib/import/guestsImport"
import type { Guest } from "@/stores/planner.store"
import {
  autoDetectMapping,
  buildGuests,
  parseGuestFile,
} from "@/lib/import/guestsImport"
import { usePlannerStore } from "@/stores/planner.store"

// Which kind of file the rows came from. Carried through the stages purely so
// the import can be reported to analytics - XLSX.read autodetects the format,
// so nothing in the parse path needs to know.
export type GuestImportFormat = "csv" | "xlsx"

type GuestImportStage =
  | { kind: "file" }
  | {
      kind: "mapping"
      format: GuestImportFormat
      headers: Array<string>
      rows: Array<Array<string>>
      mapping: ColumnMapping
    }
  | {
      kind: "preview"
      format: GuestImportFormat
      headers: Array<string>
      rows: Array<Array<string>>
      mapping: ColumnMapping
      guests: Array<Omit<Guest, "id">>
      skipped: number
      overflowed: number
    }
  | { kind: "committing" }
  | { kind: "error"; message: string }

type Translate = (key: string, opts?: Record<string, unknown>) => string

export const useGuestImportWizard = ({ t }: { t: Translate }) => {
  const [stage, setStage] = useState<GuestImportStage>({ kind: "file" })

  const reset = () => setStage({ kind: "file" })

  const setCommitting = () => setStage({ kind: "committing" })

  const setErrorMessage = (message: string) =>
    setStage({ kind: "error", message })

  const onFileChosen = async (file: File) => {
    try {
      const { headers, rows } = await parseGuestFile(file)
      if (headers.length === 0 || rows.length === 0) {
        setErrorMessage(t("guests.import.empty"))
        return
      }
      setStage({
        kind: "mapping",
        format: file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx",
        headers,
        rows,
        mapping: autoDetectMapping(headers),
      })
    } catch (error) {
      // Surface the underlying reason in the console - the user only sees the
      // friendly "expected a simple table" message, but this aids debugging
      // genuine parse/loader failures.
      console.error("[guests.import] failed to parse file", error)
      setErrorMessage(t("guests.import.parse_failed"))
    }
  }

  const setMapping = (field: GuestImportField, col: number | null) => {
    setStage((prev) =>
      prev.kind === "mapping"
        ? { ...prev, mapping: { ...prev.mapping, [field]: col } }
        : prev
    )
  }

  const onMappingConfirmed = () => {
    setStage((prev) => {
      if (prev.kind !== "mapping") return prev
      const { tables, guests: existingGuests } = usePlannerStore.getState()
      const { guests, skipped, overflowed } = buildGuests(
        prev.rows,
        prev.mapping,
        tables,
        existingGuests
      )
      return {
        kind: "preview",
        format: prev.format,
        headers: prev.headers,
        rows: prev.rows,
        mapping: prev.mapping,
        guests,
        skipped,
        overflowed,
      }
    })
  }

  const backToMapping = () => {
    setStage((prev) =>
      prev.kind === "preview"
        ? {
            kind: "mapping",
            format: prev.format,
            headers: prev.headers,
            rows: prev.rows,
            mapping: prev.mapping,
          }
        : prev
    )
  }

  return {
    stage,
    reset,
    setCommitting,
    setErrorMessage,
    onFileChosen,
    setMapping,
    onMappingConfirmed,
    backToMapping,
  }
}
