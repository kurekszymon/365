import { beforeEach, describe, expect, it } from "vitest"
import { requireAcceptedTerms } from "./guards"
import type { Session } from "@supabase/supabase-js"
import type { TermsStatus } from "@/stores/profile.store"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"

// Only the presence of a session matters to this guard.
const SESSION = { user: { id: "u1" } } as Session

const setup = (opts: {
  isReady?: boolean
  session?: Session | null
  termsStatus?: TermsStatus
}) => {
  useAuthStore.setState({
    isReady: opts.isReady ?? true,
    session: opts.session === undefined ? SESSION : opts.session,
  })
  useProfileStore.setState({ termsStatus: opts.termsStatus ?? "outstanding" })
}

/**
 * The thrown value is a router redirect, which carries its target under
 * `options` rather than at the top level; we only care where it points.
 */
const redirectFrom = (pathname: string) => {
  try {
    requireAcceptedTerms(pathname)
  } catch (thrown) {
    return (thrown as { options: { to: string; search: { next?: string } } })
      .options
  }
  return null
}

describe("requireAcceptedTerms", () => {
  beforeEach(() => {
    useAuthStore.setState({ isReady: false, session: null })
    useProfileStore.getState().reset()
  })

  it("sends a user with an outstanding acceptance to the gate", () => {
    setup({})

    expect(redirectFrom("/settings")).toMatchObject({
      to: "/accept-terms",
      search: { next: "/settings" },
    })
  })

  it("gates /home, which is otherwise reachable without an account", () => {
    setup({})

    expect(redirectFrom("/home")?.to).toBe("/accept-terms")
  })

  it("lets the accepted through", () => {
    setup({ termsStatus: "accepted" })

    expect(redirectFrom("/settings")).toBeNull()
  })

  // Each of these is a not-settled-yet state, not a verdict. Redirecting on
  // them would bounce every signed-in user through the gate on a cold load.
  it("lets an unresolved status through", () => {
    setup({ termsStatus: "unknown" })

    expect(redirectFrom("/settings")).toBeNull()
  })

  it("lets an unsettled session through", () => {
    setup({ isReady: false })

    expect(redirectFrom("/settings")).toBeNull()
  })

  it("ignores signed-out visitors, who have no contract to accept", () => {
    setup({ session: null })

    expect(redirectFrom("/wedding/local")).toBeNull()
  })

  // The gate links to these in a new tab - redirecting them away would ask
  // someone to accept a document we then refuse to show them.
  it.each([
    "/pl/terms",
    "/en/terms",
    "/pl/privacy",
    "/en/privacy",
    "/pl",
    "/en",
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/accept-terms",
  ])("leaves %s reachable", (pathname) => {
    setup({})

    expect(redirectFrom(pathname)).toBeNull()
  })

  it("does not treat a path merely prefixed with an exempt one as exempt", () => {
    setup({})

    expect(redirectFrom("/planner")?.to).toBe("/accept-terms")
    expect(redirectFrom("/entertainment")?.to).toBe("/accept-terms")
  })
})
