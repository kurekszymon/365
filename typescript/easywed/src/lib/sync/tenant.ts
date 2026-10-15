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

type TenantClaimFailure = "invalid" | "suspended" | "other_venue" | "failed"

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
  PT410: "suspended",
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
 * Only the staff join calls this. A couple's invitation goes through
 * `acceptCustomerInvitation`, which joins *and* links a wedding in one
 * transaction - neither is the art. 9(2)(a) consent for the guest list, which
 * stays a separate `set_venue_access(true)`.
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

/** What a live invitation says about itself before anything is spent. */
export type TenantInvitePreview = {
  role: "staff" | "customer"
  expiresAt: string
  tenant: PublicTenant
}

/**
 * `invalid` is the database's verdict (unknown, claimed or expired - the
 * preview collapses them, as PT404 does); `failed` is no verdict at all.
 * Kept apart because only one of them is worth a "try again".
 */
export type TenantInvitePreviewResult =
  | { kind: "ok"; preview: TenantInvitePreview }
  | { kind: "invalid" }
  | { kind: "failed" }

/**
 * Names the venue and role behind a token, without spending it.
 *
 * Callable signed out (`tenant_invitation_preview` is granted to `anon`), which
 * is what lets the invitation page greet a visitor with the venue's name before
 * asking them to make an account - and what makes the claim an explicit click
 * rather than a side effect of opening the URL (20260820000001 §4b).
 *
 * Mapped onto `PublicTenant` so `TenantWordmark` / `tenantStyle` render it
 * as-is. The preview carries no id, accent or tagline, and nothing on the
 * invitation page reads them: the id is deliberately withheld, and the empty
 * string is never used as one.
 */
export const previewTenantInvitation = (
  token: string,
  signal?: AbortSignal
): Promise<TenantInvitePreviewResult> =>
  total<TenantInvitePreviewResult>(
    "previewTenantInvitation",
    async () => {
      const query = supabase.rpc("tenant_invitation_preview", { _token: token })
      const { data, error } = await (signal ? query.abortSignal(signal) : query)

      if (error) {
        console.error("[tenant] previewTenantInvitation failed", error)
        return { kind: "failed" }
      }

      const row = data.at(0)
      if (!row) return { kind: "invalid" }

      return {
        kind: "ok",
        preview: {
          // The CHECK pins both; narrowed rather than asserted, and an
          // unexpected value reads as the role with fewer doors.
          role: row.role === "staff" ? "staff" : "customer",
          expiresAt: row.expires_at,
          tenant: {
            id: "",
            slug: row.tenant_slug,
            name: row.tenant_name,
            status: row.tenant_status === "active" ? "active" : "suspended",
            logoUrl: row.logo_url,
            primaryColor: row.primary_color,
            accentColor: null,
            tagline: null,
          },
        },
      }
    },
    { kind: "failed" }
  )

/** One of the caller's weddings, as the invitation's wedding picker needs it. */
export type InviteWedding = {
  id: string
  name: string
  /** Only an owner can link (`link_wedding_to_venue`), so only these are offered. */
  isOwner: boolean
  /** The venue it is linked to now, if any - what a re-link would replace. */
  venue: { tenantId: string; slug: string; name: string } | null
}

/**
 * Every wedding the caller can see, with its current venue.
 *
 * All of them rather than only owned ones, because the picker has something to
 * say about the rest: a plan shared with you is not yours to link, and the
 * honest next step is "forward this link to the person who created it" - which
 * the page can only offer if it knows there are such plans.
 *
 * The embedded `tenants` row is readable through "wedding members can view
 * their linked venue" (20260817000002). `null` on failure; the page renders a
 * retry rather than an empty list, which would read as "you have no weddings"
 * and push a returning user into creating a duplicate.
 */
export const fetchInviteWeddings = (
  userId: string,
  signal?: AbortSignal
): Promise<Array<InviteWedding> | null> =>
  total(
    "fetchInviteWeddings",
    async () => {
      const query = supabase
        .from("weddings")
        .select("id, name, owner_id, tenants (id, slug, name)")
        .order("created_at", { ascending: false })

      const { data, error } = await (signal ? query.abortSignal(signal) : query)

      if (error) {
        console.error("[tenant] fetchInviteWeddings failed", error)
        return null
      }

      return data.map((row) => ({
        id: row.id,
        name: row.name,
        isOwner: row.owner_id === userId,
        venue: row.tenants
          ? {
              tenantId: row.tenants.id,
              slug: row.tenants.slug,
              name: row.tenants.name,
            }
          : null,
      }))
    },
    null
  )

/** The caller's one venue membership, whatever its role. */
export type MyVenueMembership = {
  tenantId: string
  slug: string
  name: string
  role: TenantRole
}

/**
 * `failed` is kept apart from "no membership" (`membership: null`): the venue
 * dialog answers the second with "ask your venue for an invitation link", and
 * telling that to a couple who *is* on a venue's list - because one request
 * dropped - sends them chasing an invitation they already accepted.
 */
export type MyVenueMembershipResult =
  | { ok: true; membership: MyVenueMembership | null }
  | { ok: false }

/**
 * The venue this account belongs to, in any role.
 *
 * The couple-side sibling of `fetchMyStaffTenant`: same single-row read (the
 * `tenant_members` SELECT policy shows everyone their own row), without the
 * staff filter. The invitation page uses it to name the venue a switch would
 * leave; the venue dialog uses it to offer "link to <your venue>" - which,
 * with open linking off, is the only venue `link_wedding_to_venue` will accept
 * from this account (`tenant_members_one_per_user`).
 *
 * Filtered on `user_id` for the reason `fetchTenantRole` is: a staff caller can
 * see their whole roster, and an unfiltered `.maybeSingle()` would error.
 */
export const fetchMyVenueMembership = (
  userId: string,
  signal?: AbortSignal
): Promise<MyVenueMembershipResult> =>
  total<MyVenueMembershipResult>(
    "fetchMyVenueMembership",
    async () => {
      const query = supabase
        .from("tenant_members")
        .select("role, tenants (id, slug, name)")
        .eq("user_id", userId)

      const { data, error } = await (
        signal ? query.abortSignal(signal) : query
      ).maybeSingle()

      if (error) {
        console.error("[tenant] fetchMyVenueMembership failed", error)
        return { ok: false }
      }

      const tenant = data?.tenants
      const role = data?.role
      if (
        !tenant ||
        (role !== "owner" && role !== "staff" && role !== "customer")
      ) {
        return { ok: true, membership: null }
      }

      return {
        ok: true,
        membership: {
          tenantId: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          role,
        },
      }
    },
    { ok: false }
  )

export type CustomerAcceptFailure =
  | "invalid"
  | "suspended"
  | "not_owner"
  | "other_venue"
  | "switch_required"
  | "failed"

export type CustomerAcceptResult =
  | { ok: true; tenantId: string }
  | { ok: false; reason: CustomerAcceptFailure }

/**
 * The SQLSTATEs `accept_customer_invitation` raises (20260820000001 §4c).
 *
 * `switch_required` (PT412) is not an error to show but a question to ask: the
 * caller is a customer of another venue, and the retry with `leaveCurrent`
 * swaps the membership. `other_venue` (PT409) is the staff case, where no flag
 * helps. 42501 is "not the owner of that wedding" in practice - the page only
 * offers owned weddings, so reaching it means the list went stale.
 */
const ACCEPT_FAILURES: Record<string, CustomerAcceptFailure> = {
  PT404: "invalid",
  PT410: "suspended",
  "42501": "not_owner",
  PT409: "other_venue",
  PT412: "switch_required",
}

/**
 * Joins the venue as a customer and links one of the caller's weddings to it,
 * in one transaction.
 *
 * The wedding lands in `pending`: this is not the art. 9(2)(a) consent, which
 * stays `set_venue_access(true)` against the disclosure dialog. The caller is
 * expected to open that dialog next rather than treat this as the end.
 */
export const acceptCustomerInvitation = (
  token: string,
  weddingId: string,
  leaveCurrent = false
): Promise<CustomerAcceptResult> =>
  total<CustomerAcceptResult>(
    "acceptCustomerInvitation",
    async () => {
      const { data, error } = await supabase.rpc("accept_customer_invitation", {
        _token: token,
        _wedding_id: weddingId,
        _leave_current: leaveCurrent,
      })

      if (error || !data) {
        console.error("[tenant] acceptCustomerInvitation failed", error)
        return {
          ok: false,
          reason: ACCEPT_FAILURES[error?.code ?? ""] ?? "failed",
        }
      }

      return { ok: true, tenantId: data }
    },
    { ok: false, reason: "failed" }
  )
