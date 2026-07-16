import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePrintStore } from "@/stores/print.store"

// Prevent i18n LanguageDetector from running in a node environment — it crashes
// when it finds a partial `window` stub and tries to read window.location.search.
vi.mock("@/i18n", () => ({
  default: { t: (k: string) => k, language: "en" },
}))

// triggerPdfExport calls flushSync (sync callback wrapper) and window.print().
// Both are stubbed below so the test runs without a browser environment.
vi.mock("react-dom", () => ({ flushSync: (fn: () => void) => fn() }))
vi.stubGlobal("window", { print: vi.fn() })

// Import after stubs are set up.
const { triggerPdfExport } = await import("@/lib/export/guestsPdf")

describe("triggerPdfExport — print store wiring", () => {
  beforeEach(() => {
    // Ensure each test starts from a clean-ish print state.
    usePrintStore.setState({ sort: "seat", fields: [] })
  })

  it("writes the requested sort into the print store", () => {
    triggerPdfExport(["name", "table"], {
      sort: "seat",
      includeSeats: false,
      seatsShowEmpty: true,
      includeGrid: true,
      showHallOutline: true,
      fitToContent: false,
    })
    expect(usePrintStore.getState().sort).toBe("seat")
  })

  it("defaults sort to 'name' when called without options", () => {
    triggerPdfExport(["name"])
    expect(usePrintStore.getState().sort).toBe("name")
  })

  it("writes fields into the print store", () => {
    triggerPdfExport(["name", "dietary"])
    expect(usePrintStore.getState().fields).toEqual(["name", "dietary"])
  })

  it("calls window.print", () => {
    const printSpy = vi.mocked(window.print)
    printSpy.mockClear()
    triggerPdfExport(["name"])
    expect(printSpy).toHaveBeenCalledOnce()
  })
})
