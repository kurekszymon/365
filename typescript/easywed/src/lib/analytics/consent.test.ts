import { afterEach, describe, expect, it, vi } from "vitest"
import posthog from "posthog-js"
import { denyConsent, grantConsent, readConsent } from "./consent"
import { useConsentStore } from "@/stores/consent.store"

const optIn = vi
  .spyOn(posthog, "opt_in_capturing")
  .mockImplementation(() => undefined)
const optOut = vi
  .spyOn(posthog, "opt_out_capturing")
  .mockImplementation(() => undefined)
const status = vi
  .spyOn(posthog, "get_explicit_consent_status")
  .mockReturnValue("pending")

const setLoaded = (loaded: boolean) => {
  ;(posthog as unknown as { __loaded: boolean }).__loaded = loaded
}

afterEach(() => {
  optIn.mockClear()
  optOut.mockClear()
  status.mockClear()
  setLoaded(false)
  useConsentStore.setState({ status: "unknown", settingsOpen: false })
})

describe("consent", () => {
  it("does nothing until posthog is initialized", () => {
    setLoaded(false)

    expect(readConsent()).toBeUndefined()
    expect(grantConsent()).toBe(false)
    expect(denyConsent()).toBe(false)
    expect(optIn).not.toHaveBeenCalled()
    expect(optOut).not.toHaveBeenCalled()
  })

  it("maps accept and reject onto posthog's opt in and opt out", () => {
    setLoaded(true)

    expect(grantConsent()).toBe(true)
    expect(optIn).toHaveBeenCalledOnce()

    expect(denyConsent()).toBe(true)
    expect(optOut).toHaveBeenCalledOnce()
  })
})

describe("useConsentStore", () => {
  it("stays unknown when posthog never loaded, so the banner stays hidden", () => {
    useConsentStore.getState().sync()
    useConsentStore.getState().accept()

    expect(useConsentStore.getState().status).toBe("unknown")
    expect(optIn).not.toHaveBeenCalled()
  })

  it("syncs the stored answer once posthog has loaded", () => {
    setLoaded(true)
    status.mockReturnValueOnce("denied")

    useConsentStore.getState().sync()

    expect(useConsentStore.getState().status).toBe("denied")
  })

  it("closes the settings view on either answer", () => {
    setLoaded(true)
    useConsentStore.setState({ status: "denied", settingsOpen: true })

    useConsentStore.getState().accept()
    expect(useConsentStore.getState()).toMatchObject({
      status: "granted",
      settingsOpen: false,
    })

    useConsentStore.getState().openSettings()
    useConsentStore.getState().reject()
    expect(useConsentStore.getState()).toMatchObject({
      status: "denied",
      settingsOpen: false,
    })
  })
})
