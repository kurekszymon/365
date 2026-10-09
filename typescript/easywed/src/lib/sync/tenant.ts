import type { PublicTenant, TenantRole } from "@/stores/tenant.store"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"

/**
 * The transport half of every "null on failure" contract in this file.
 *
 * PostgREST reports a refused or malformed query as an error *result*, which
 * each helper below already turns into its documented fallback. A request that
 * never completed - offline, DNS, CORS, a dropped connection - arrives as a
 * rejected promise instead, and since every caller in the tenant tree is a
 * fire-and-forget `void x.then(...)` inside an effect, that is not a logged
 * failure but a screen that never leaves its loading state.
 *
 * Made total here rather than in a `.catch()` per call site, which would put the
 * fallback decision in two places. An `abortSignal` cancellation is *not* what
 * this catches - supabase-js surfaces that as an error result, so the callers'
 * `signal.aborted` guards keep doing the cancellation work.
 */
const total = async <T>(
  where: string,
  work: () => Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await work()
  } catch (err) {
    console.error(`[tenant] ${where} threw`, err)
    return fallback
  }
}

/**
 * The venue's public face, by slug. Callable with no session at all - it goes
 * through the `tenant_public` definer RPC rather than reading `tenants`, whose
 * SELECT policy is member-only, because a signed-out visitor landing on
 * bagatelka.easywed.app has to see the branding before there is anything to
 * authorize.
 *
 * Returns `null` for both "no such slug" and "the lookup failed", which the
 * caller renders identically as "no such venue". Collapsing them is deliberate:
 * an anonymous visitor can do nothing about either, and a venue rendered as
 * exists-but-broken is worse than one rendered as absent. Still logged.
 */
export const fetchPublicTenant = (
  slug: string,
  signal?: AbortSignal
): Promise<PublicTenant | null> =>
  total(
    "fetchPublicTenant",
    async () => {
      const query = supabase.rpc("tenant_public", { _slug: slug })

      const { data, error } = await (signal ? query.abortSignal(signal) : query)

      if (error) {
        console.error("[tenant] fetchPublicTenant failed", error)
        return null
      }

      // Set-returning, so an unknown slug is an empty array, not a null row.
      // `.at(0)` rather than `[0]` because the generated types index as `T`, not
      // `T | undefined`, so the guard below would read as dead code.
      const row = data.at(0)
      if (!row) return null

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        // The CHECK pins this to one of two values; the generated type widens it
        // to string. Narrowed rather than asserted, so an unexpected value reads
        // as "suspended" - the conservative direction.
        status: row.status === "active" ? "active" : "suspended",
        logoUrl: row.logo_url,
        primaryColor: row.primary_color,
        accentColor: row.accent_color,
        tagline: row.tagline,
      }
    },
    null
  )

/**
 * The signed-in user's role in this tenant, or `null` if they are not a member.
 *
 * Reads `tenant_members` directly rather than through a helper RPC: the SELECT
 * policy already narrows it to "staff see the roster, everyone else sees their
 * own row", so filtering on the caller's own id costs one indexed lookup.
 *
 * `null` on failure as well as on non-membership - the fail-closed direction,
 * which the CRM layout turns into a 403 rather than a blank shell.
 */
export const fetchTenantRole = (
  tenantId: string,
  userId: string,
  signal?: AbortSignal
): Promise<TenantRole | null> =>
  total(
    "fetchTenantRole",
    async () => {
      const query = supabase
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)

      const { data, error } = await (
        signal ? query.abortSignal(signal) : query
      ).maybeSingle()

      if (error) {
        console.error("[tenant] fetchTenantRole failed", error)
        return null
      }

      const role = data?.role
      return role === "owner" || role === "staff" || role === "customer"
        ? role
        : null
    },
    null
  )

/**
 * The venue this account works for, or null - including for a `customer`, who
 * is somebody's client rather than their staff and reaches none of the CRM.
 *
 * The apex's half of the sign-in landing, standing in for the hostname that
 * names the tenant on a venue host. One indexed lookup on the caller's own
 * `tenant_members` row, with the slug embedded because the CRM lives on
 * `<slug>.easywed.app` and an id cannot be navigated to.
 *
 * `maybeSingle` is safe because of `tenant_members_one_per_user`; if that index
 * ever goes, this has to pick a venue rather than error into null - the same
 * caveat `my_tenant_id()` carries.
 *
 * Null on failure as well as on non-membership: the caller is usually a couple,
 * and failing that way costs a wedding list rather than an undoable bounce.
 */
export const fetchMyStaffTenant = (
  userId: string,
  signal?: AbortSignal
): Promise<{ id: string; slug: string } | null> =>
  total(
    "fetchMyStaffTenant",
    async () => {
      const query = supabase
        .from("tenant_members")
        .select("tenants (id, slug)")
        .eq("user_id", userId)
        .in("role", ["owner", "staff"])

      const { data, error } = await (
        signal ? query.abortSignal(signal) : query
      ).maybeSingle()

      if (error) {
        console.error("[tenant] fetchMyStaffTenant failed", error)
        return null
      }

      const tenant = data?.tenants
      return tenant ? { id: tenant.id, slug: tenant.slug } : null
    },
    null
  )

/** The venue a claim landed in, plus what it made the caller. */
export type ClaimedTenant = {
  id: string
  slug: string
  name: string
  role: TenantRole
}

/** Discriminated so the claim page can name the reason rather than shrug. */
export type TenantClaimResult =
  | { ok: true; tenant: ClaimedTenant }
  | { ok: false; reason: TenantClaimFailure }

type TenantClaimFailure = "invalid" | "other_venue" | "failed"

/**
 * The SQLSTATEs `claim_tenant_invitation` raises, mapped to the sentence the
 * page renders. A code missing here falls to "failed" and a generic retry.
 *
 * Keyed on `error.code`, not `error.message` - see LINK_FAILURES in venue.ts.
 *
 * PT409 must not collapse into the generic case: `tenant_members_one_per_user`
 * allows one membership per account, so an account already attached to another
 * venue cannot fix this by retrying, and "something went wrong" does not say so.
 */
const CLAIM_FAILURES: Record<string, TenantClaimFailure> = {
  PT404: "invalid",
  PT409: "other_venue",
}

/**
 * Spends an invitation token, joining the caller to the venue that issued it.
 *
 * The claim is the consent: a `tenant_members` row hands the venue this person's
 * `profiles.display_name` through `staff_can_view_profile`, which is why the
 * table has no INSERT policy and why this goes through a definer RPC called with
 * the *recipient's* session (20260820000001).
 *
 * Joining as `customer` buys one thing: the ability to call
 * `link_wedding_to_venue` for an invitation-only venue. Not the art. 9(2)(a)
 * consent for the guest list - that is a separate `set_venue_access(true)`.
 */
export const claimTenantInvitation = (
  token: string,
  signal?: AbortSignal
): Promise<TenantClaimResult> =>
  // The whole body, not just the RPC: the two follow-up reads can fail at the
  // transport layer too, and a rejection out of either strands the claim page.
  total<TenantClaimResult>(
    "claimTenantInvitation",
    async () => {
      const query = supabase.rpc("claim_tenant_invitation", { _token: token })
      const { data, error } = await (signal ? query.abortSignal(signal) : query)

      if (error || !data) {
        console.error("[tenant] claimTenantInvitation failed", error)
        return {
          ok: false,
          reason: CLAIM_FAILURES[error?.code ?? ""] ?? "failed",
        }
      }

      // Two reads rather than a wider RPC return: the row just written makes
      // `is_tenant_member` true, which is what the `tenants` SELECT policy asks
      // for, so both are ordinary member reads.
      //
      // The role read goes through `fetchTenantRole` for its `user_id` filter.
      // The `tenant_members` SELECT policy is `is_tenant_staff(tenant_id) or
      // user_id = auth.uid()`, so a successful staff claim can see the whole
      // roster - an unfiltered `.maybeSingle()` would error on multiple rows and
      // fall back to "customer", sending the new staff member to /home.
      const userId = useAuthStore.getState().session?.user.id

      const [tenantRes, role] = await Promise.all([
        supabase
          .from("tenants")
          .select("id, slug, name")
          .eq("id", data)
          .single(),
        userId ? fetchTenantRole(data, userId, signal) : Promise.resolve(null),
      ])

      // `.single()` turns "no row" into an error rather than a null row, so the
      // error check is the whole guard.
      if (tenantRes.error) {
        console.error("[tenant] claimed venue lookup failed", tenantRes.error)
        return { ok: false, reason: "failed" }
      }

      return {
        ok: true,
        tenant: {
          id: tenantRes.data.id,
          slug: tenantRes.data.slug,
          name: tenantRes.data.name,
          // `fetchTenantRole` narrows the column; what is left is the `null` it
          // returns for a failed read. "customer" is the conservative fallback -
          // the fewest onward doors, so a failed read cannot advertise a CRM the
          // caller may not reach.
          role: role ?? "customer",
        },
      }
    },
    { ok: false, reason: "failed" }
  )
