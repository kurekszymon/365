import { flushSync } from "react-dom"
import { DEFAULT_GUEST_SORT } from "./guests"
import type { GuestField } from "@/lib/export/guestsCsv"
import type { GuestSort } from "./guests"
import { usePrintStore } from "@/stores/print.store"
import { track } from "@/lib/analytics/track"

export { groupGuestsByTable } from "./guests"
export type { TableGroup } from "./guests"

type PdfExportOptions = {
  sort: GuestSort
  includeAgeGroups: boolean
  includeSeats: boolean
  seatsShowEmpty: boolean
  includeGrid: boolean
  showHallOutline: boolean
  fitToContent: boolean
}

const DEFAULT_OPTIONS: PdfExportOptions = {
  sort: DEFAULT_GUEST_SORT,
  includeAgeGroups: true,
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
    usePrintStore.getState().setSort(options.sort)
    usePrintStore.getState().setIncludeAgeGroups(options.includeAgeGroups)
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
  // Before window.print(), which blocks on the browser's modal print UI. The
  // event only says the plan reached that dialog - whether the user then saved
  // a PDF, printed it or cancelled is not observable from here.
  track("plan_printed", {
    trigger: "export_dialog",
    include_seats: options.includeSeats,
  })
  window.print()
}
