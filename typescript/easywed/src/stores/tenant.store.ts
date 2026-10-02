import { create } from "zustand"

/**
 * Which tenant, if any, this origin belongs to.
 *
 * "unknown" is the pre-resolution state and deliberately does *not* gate: guards
 * let it through and TenantGate invalidates the router once the real answer
 * lands, like `isReady` in useAuthStore. Gating on it would flash a 403 at every
 * staff member on every cold load.
 *
 * "none" is the apex, a *resolved* answer rather than an absence -
 * `tenantSlugFromHost` decides it synchronously, before the first paint.
 */
export type TenantStatus = "unknown" | "none" | "resolved" | "not_found"

/**
 * The caller's standing in this tenant. Mirrors `tenant_members.role`, plus
 * `null` for "resolved, and they are not a member" - which is how a couple who
 * wandered onto a venue host looks, and what the CRM's 403 screen keys off.
 *
 * `undefined` is "not resolved yet", the same not-settled-yet convention the
 * rest of the file uses.
 */
export type TenantRole = "owner" | "staff" | "customer"

/**
 * The public face of a tenant, as `tenant_public()` returns it. Columns, not a
 * `brand` blob, and that is load-bearing: the branding values are written into
 * `element.style`, and their CHECK regexes in the database are the
 * CSS-injection guard. A blob could not carry those constraints.
 */
export type PublicTenant = {
  id: string
  slug: string
  name: string
  /** "suspended" renders an explicable page rather than "no such venue". */
  status: "active" | "suspended"
  logoUrl: string | null
  primaryColor: string | null
  accentColor: string | null
  tagline: string | null
}

type State = {
  status: TenantStatus
  /**
   * The slug the *host* names, known before the lookup resolves and still set
   * when it comes back empty - the "no such venue" page needs to say which one.
   * Null on the apex.
   */
  slug: string | null
  /** Null until `tenant_public()` answers, and on the apex. */
  tenant: PublicTenant | null
  /**
   * undefined = not resolved yet; null = resolved, not a member.
   * Two distinct states, because a guard must pass through the first and a
   * layout must render a 403 for the second.
   */
  tenantRole: TenantRole | null | undefined
}

type Action = {
  setStatus: (status: TenantStatus) => void
  setSlug: (slug: string | null) => void
  setTenant: (tenant: PublicTenant | null) => void
  setTenantRole: (tenantRole: TenantRole | null | undefined) => void
  reset: () => void
}

const initial: State = {
  status: "unknown",
  slug: null,
  tenant: null,
  tenantRole: undefined,
}

/**
 * Plain `create`, following profile.store. Deliberately **not** persisted: the
 * host is the source of truth and is re-read on every load, so a cached tenant
 * could only ever be a stale one.
 */
export const useTenantStore = create<State & Action>((set) => ({
  ...initial,

  setStatus: (status) => set({ status }),
  setSlug: (slug) => set({ slug }),
  setTenant: (tenant) => set({ tenant }),
  setTenantRole: (tenantRole) => set({ tenantRole }),
  reset: () => set({ ...initial }),
}))

/**
 * Whether the caller may reach the CRM. An allowlist, like `selectCanEdit` in
 * global.store, failing closed on both `undefined` (still resolving) and `null`
 * (not a member). Callers that need to tell those apart - the CRM layout,
 * spinner for one and 403 for the other - read `tenantRole` directly.
 *
 * `customer` is excluded on purpose: a couple married at a venue is a member of
 * that tenant and reaches none of its CRM.
 */
export const selectIsTenantStaff = (state: State): boolean =>
  state.tenantRole === "owner" || state.tenantRole === "staff"
