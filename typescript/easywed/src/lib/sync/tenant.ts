import type { PublicTenant, TenantRole } from "@/stores/tenant.store"
import { supabase } from "@/lib/supabase"

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
