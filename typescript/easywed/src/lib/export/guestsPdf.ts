import { flushSync } from "react-dom"
import type { GuestField } from "@/lib/export/guestsCsv"
import { usePrintStore } from "@/stores/print.store"

export { groupGuestsByTable } from "./guests"
export type { TableGroup } from "./guests"

export const triggerPdfExport = (fields: Array<GuestField>) => {
  // flushSync forces React to commit the setFields update before window.print()
  // https:// react.dev/reference/react-dom/flushSync#usage
  flushSync(() => {
    usePrintStore.getState().setFields(fields)
  })
  window.print()
}
