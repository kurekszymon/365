import { beforeEach, describe, expect, it } from "vitest"
import { requireAcceptedTerms, requireTenantMember } from "./guards"
import type { Session } from "@supabase/supabase-js"
import type { TermsStatus } from "@/stores/profile.store"
import type { TenantRole, TenantStatus } from "@/stores/tenant.store"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"
import { useTenantStore } from "@/stores/tenant.store"

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

  // A recovery link signs the user in, so this guard sees a session and would
  // otherwise send them to the acceptance gate - and from there to /home, with
  // the password still unchanged.
  it.each(["/forgot-password", "/reset-password"])(
    "leaves %s reachable, so a recovery is not swallowed by the gate",
    (pathname) => {
      setup({})

      expect(redirectFrom(pathname)).toBeNull()
    }
  )

  it("does not treat a path merely prefixed with an exempt one as exempt", () => {
    setup({})

    expect(redirectFrom("/planner")?.to).toBe("/accept-terms")
    expect(redirectFrom("/entertainment")?.to).toBe("/accept-terms")
  })
})

const setupTenant = (opts: {
  isReady?: boolean
  session?: Session | null
  status?: TenantStatus
  tenantRole?: TenantRole | null
}) => {
  useAuthStore.setState({
    isReady: opts.isReady ?? true,
    session: opts.session === undefined ? SESSION : opts.session,
  })
  useTenantStore.setState({
    status: opts.status ?? "resolved",
    tenantRole: opts.tenantRole,
  })
}

const tenantRedirectFrom = (pathname: string) => {
  try {
    requireTenantMember(pathname)
  } catch (thrown) {
    return (thrown as { options: { to: string; search: { next?: string } } })
      .options
  }
  return null
}

describe("requireTenantMember", () => {
  beforeEach(() => {
    useAuthStore.setState({ isReady: false, session: null })
    useTenantStore.getState().reset()
  })

  // Same not-settled-yet contract as the guards above, and the same reason for
  // it: a redirect on an unresolved state fires on the frame before the answer
  // arrives and bounces a legitimate user out of the page they asked for.
  it("lets an unsettled session through", () => {
    setupTenant({ isReady: false })

    expect(tenantRedirectFrom("/crm")).toBeNull()
  })

  it("lets an unresolved tenant through", () => {
    setupTenant({ status: "unknown" })

    expect(tenantRedirectFrom("/crm")).toBeNull()
  })

  it("sends an apex visitor to /home, since there is no venue to run", () => {
    setupTenant({ status: "none" })

    expect(tenantRedirectFrom("/crm")?.to).toBe("/home")
  })

  // Ahead of the session check on purpose: on the apex there is no CRM to sign
  // in to, so asking for credentials first would be a dead end.
  it("sends a signed-out apex visitor to /home rather than /login", () => {
    setupTenant({ status: "none", session: null })

    expect(tenantRedirectFrom("/crm")?.to).toBe("/home")
  })

  it("sends a signed-out visitor on a venue host to /login", () => {
    setupTenant({ session: null })

    expect(tenantRedirectFrom("/crm/customers")).toMatchObject({
      to: "/login",
      search: { next: "/crm/customers" },
    })
  })

  // A guard cannot render, and both of these have to be shown inside the
  // venue's own shell. Bouncing a customer to /home in particular would read as
  // "no such page" when the honest answer is "it exists and is not yours".
  it("leaves an unknown slug to the layout's not-found screen", () => {
    setupTenant({ status: "not_found" })

    expect(tenantRedirectFrom("/crm")).toBeNull()
  })

  it.each([null, "customer" as const])(
    "leaves a non-staff caller (%s) to the layout's 403 screen",
    (tenantRole) => {
      setupTenant({ tenantRole })

      expect(tenantRedirectFrom("/crm")).toBeNull()
    }
  )

  // The guard never consults tenantRole: it settles a round trip after status,
  // so blocking on it would stall every /crm navigation to decide something the
  // layout decides anyway.
  it.each(["owner" as const, "staff" as const, undefined])(
    "admits a signed-in caller with role %s",
    (tenantRole) => {
      setupTenant({ tenantRole })

      expect(tenantRedirectFrom("/crm")).toBeNull()
    }
  )
})
