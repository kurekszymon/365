import { afterEach, describe, expect, it, vi } from "vitest"
import posthog from "posthog-js"
import { track } from "./track"

const capture = vi
  .spyOn(posthog, "capture")
  .mockImplementation(() => ({}) as never)

const setLoaded = (loaded: boolean) => {
  ;(posthog as unknown as { __loaded: boolean }).__loaded = loaded
}

afterEach(() => {
  capture.mockClear()
  setLoaded(false)
})

describe("track", () => {
  it("stays silent until posthog is initialized", () => {
    setLoaded(false)
    track("invite_claimed")
    track("reminder_created", { has_due_date: true })

    // Not an optimization: these call sites are stores and plain modules that
    // also run under vitest and during SSR, where init never happened and
    // posthog-js warns on every capture.
    expect(capture).not.toHaveBeenCalled()
  })

  it("forwards the event name and properties once initialized", () => {
    setLoaded(true)
    track("table_added", { shape: "round" })

    expect(capture).toHaveBeenCalledExactlyOnceWith("table_added", {
      shape: "round",
    })
  })

  it("sends no properties for events that declare none", () => {
    setLoaded(true)
    track("invite_claimed")

    expect(capture).toHaveBeenCalledExactlyOnceWith("invite_claimed", undefined)
  })
})
