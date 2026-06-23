import { flushSync } from "react-dom"
import type { GuestField } from "@/lib/export/guestsCsv"
import { usePrintStore } from "@/stores/print.store"

export { groupGuestsByTable } from "./guests"
export type { TableGroup } from "./guests"

type PdfExportOptions = {
  includeSeats: boolean
  seatsShowEmpty: boolean
  includeGrid: boolean
  showHallOutline: boolean
  fitToContent: boolean
}

const DEFAULT_OPTIONS: PdfExportOptions = {
  includeSeats: false,
  seatsShowEmpty: true,
  includeGrid: true,
  showHallOutline: true,
  fitToContent: false,
}

export const triggerPdfExport = (
  fields: Array<GuestField>,
  options: PdfExportOptions = DEFAULT_OPTIONS
) => {
  // flushSync forces React to commit the store updates before window.print()
  // https:// react.dev/reference/react-dom/flushSync#usage
  flushSync(() => {
    usePrintStore.getState().setFields(fields)
    usePrintStore.getState().setSeatOptions({
      includeSeats: options.includeSeats,
      seatsShowEmpty: options.seatsShowEmpty,
    })
    usePrintStore.getState().setLayoutOptions({
      includeGrid: options.includeGrid,
      showHallOutline: options.showHallOutline,
      fitToContent: options.fitToContent,
    })
  })
  window.print()
}
