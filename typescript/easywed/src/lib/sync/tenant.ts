import type { PublicTenant, TenantRole } from "@/stores/tenant.store"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"

/**
 * The venue's public face, by slug. Callable with no session at all - it goes
 * through the `tenant_public` definer RPC rather than reading `tenants`, whose
 * SELECT policy is member-only, because a signed-out visitor landing on
 * bagatelka.easywed.app has to see the branding before there is anything to
 * authorize.
 *
 * Returns `null` for both "no such slug" and "the lookup failed", which the
 * caller renders identically as "no such venue". Collapsing them is deliberate:
 * distinguishing them would need the error surfaced to an anonymous visitor who
 * can do nothing about either, and a network failure that renders as a venue
 * that exists-but-is-broken is worse than one that renders as absent. The
 * error is still logged.
 */
export const fetchPublicTenant = async (
  slug: string,
  signal?: AbortSignal
): Promise<PublicTenant | null> => {
  const query = supabase.rpc("tenant_public", { _slug: slug })

  const { data, error } = await (signal ? query.abortSignal(signal) : query)

  if (error) {
    console.error("[tenant] fetchPublicTenant failed", error)
    return null
  }

  // Set-returning, so an unknown slug is an empty array rather than a null row.
  //
  // `.at(0)` rather than `[0]` because the generated types index as `T`, not
  // `T | undefined` - so the guard below reads as dead code to the linter while
  // being exactly what catches the empty case at runtime. `.at()` types the
  // absence honestly instead of asserting it away.
  const row = data.at(0)
  if (!row) return null

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    // The CHECK constraint pins this to one of two values; the generated type
    // widens it to string because Postgres CHECKs do not survive into the
    // schema types. Narrowed here rather than asserted, so an unexpected value
    // reads as "suspended" - the conservative direction, since the alternative
    // is presenting a suspended venue as open for business.
    status: row.status === "active" ? "active" : "suspended",
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    tagline: row.tagline,
  }
}

/**
 * The signed-in user's role in this tenant, or `null` if they are not a member.
 *
 * Reads `tenant_members` directly rather than through a helper RPC: the SELECT
 * policy already narrows it to "staff see the roster, everyone else sees their
 * own row", so filtering on the caller's own id needs no extra privilege and
 * costs one indexed lookup.
 *
 * `null` on failure as well as on non-membership, which is the fail-closed
 * direction - the CRM layout turns both into a 403 rather than a blank shell.
 */
export const fetchTenantRole = async (
  tenantId: string,
  userId: string,
  signal?: AbortSignal
): Promise<TenantRole | null> => {
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
}

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
 * Keyed on `error.code`, not `error.message`, for the reason spelled out on
 * LINK_FAILURES in venue.ts: the message is prose the migration is free to
 * reword and PostgREST is free to wrap.
 *
 * PT409 is the one that must not collapse into the generic case.
 * `tenant_members_one_per_user` allows one membership per account, so an
 * account already attached to another venue cannot fix this by retrying - the
 * only ways forward are leaving that venue or using a different account, and
 * nothing in "something went wrong" says so.
 */
const CLAIM_FAILURES: Record<string, TenantClaimFailure> = {
  PT404: "invalid",
  PT409: "other_venue",
}

/**
 * Spends an invitation token, joining the caller to the venue that issued it.
 *
 * The claim is the consent. A `tenant_members` row is what hands the venue this
 * person's `profiles.display_name` through `staff_can_view_profile`, which is
 * why `tenant_members` has no INSERT policy and why this goes through a definer
 * RPC called with the *recipient's* session - see 20260820000001.
 *
 * Joining as `customer` buys exactly one thing: the ability to call
 * `link_wedding_to_venue` for an invitation-only venue. It is emphatically not
 * the art. 9(2)(a) consent for the guest list - that is still a separate
 * `set_venue_access(true)` against a dialog that names what is disclosed.
 */
export const claimTenantInvitation = async (
  token: string,
  signal?: AbortSignal
): Promise<TenantClaimResult> => {
  const query = supabase.rpc("claim_tenant_invitation", { _token: token })
  const { data, error } = await (signal ? query.abortSignal(signal) : query)

  if (error || !data) {
    console.error("[tenant] claimTenantInvitation failed", error)
    return { ok: false, reason: CLAIM_FAILURES[error?.code ?? ""] ?? "failed" }
  }

  // Two reads rather than a wider RPC return, because both are now ordinary
  // member reads: the row just written makes `is_tenant_member` true, which is
  // exactly what the `tenants` SELECT policy asks for.
  //
  // The role read goes through `fetchTenantRole` so it carries the `user_id`
  // filter. The `tenant_members` SELECT policy is *not* "members view
  // themselves" alone - it is `is_tenant_staff(tenant_id) or user_id =
  // auth.uid()`, so the moment a staff claim succeeds the caller can see the
  // venue's whole roster. An unfiltered `.maybeSingle()` would then error on
  // multiple rows and fall back to "customer", which is precisely backwards:
  // the new staff member would be shown the couple's card and sent to /home.
  const userId = useAuthStore.getState().session?.user.id

  const [tenantRes, role] = await Promise.all([
    supabase.from("tenants").select("id, slug, name").eq("id", data).single(),
    userId ? fetchTenantRole(data, userId, signal) : Promise.resolve(null),
  ])

  // `.single()` turns "no row" into an error rather than a null row, so the
  // error check is the whole guard - and the generated types agree, which is
  // why a `!tenantRes.data` here reads as always-false to the linter.
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
      // `fetchTenantRole` already narrows the column; what is left to decide is
      // the `null` it returns for a failed read (or the session vanishing
      // mid-claim). "customer" is the conservative fallback: it is the role
      // that offers the fewest onward doors, so a failed read cannot advertise
      // a CRM the caller may not reach.
      role: role ?? "customer",
    },
  }
}
