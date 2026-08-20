import { useCallback, useEffect, useState } from "react"

import { useAuthStore } from "@/stores/auth.store"
import { useTenantStore } from "@/stores/tenant.store"
import { supabase } from "@/lib/supabase"
import { fetchDisplayNames } from "@/lib/sync/profile"
import { apexOrigin, tenantOrigin } from "@/lib/tenant/host"
import { track } from "@/lib/analytics/track"
import i18n from "@/i18n"

/** The two roles an invitation may carry. 'owner' is provisioned, never invited. */
export type TenantInviteRole = "staff" | "customer"

export type TenantInvitation = {
  id: string
  role: TenantInviteRole
  token: string
  expires_at: string
  claimed_at: string | null
  created_at: string
}

export type TenantMember = {
  user_id: string
  role: "owner" | TenantInviteRole
  created_at: string
  display_name: string | null
}

/**
 * Everything the roster screen needs, and every Supabase call it makes.
 *
 * Modelled on `useWeddingMembers`, deliberately: the two screens are the same
 * screen for two different trees, and keeping the shapes aligned is what stops
 * the tenant side from quietly inventing a laxer rule. The one structural
 * difference is that there is no guest-mode branch - a venue has no local
 * equivalent, so nothing here is gated on a sentinel id.
 *
 * The security-relevant asymmetries are all in the database
 * (20260820000001), and this hook only mirrors them so the UI is honest:
 *
 *   - only an owner may invite `staff`, so `canInviteStaff` hides the option
 *     for a plain staff member rather than letting them hit an RLS refusal;
 *   - `owner` rows carry no remove button, because both DELETE policies
 *     exclude them;
 *   - removing a member does *not* touch any wedding they linked. Membership
 *     and `venue_access` are separate decisions with separate RPCs.
 */
export function useTenantRoster(tenantId: string | undefined) {
  const session = useAuthStore((s) => s.session)
  const tenantRole = useTenantStore((s) => s.tenantRole)
  const slug = useTenantStore((s) => s.tenant?.slug)

  const canInviteStaff = tenantRole === "owner"

  const [role, setRole] = useState<TenantInviteRole>("customer")
  const [submitting, setSubmitting] = useState(false)
  const [invitations, setInvitations] = useState<Array<TenantInvitation>>([])
  const [members, setMembers] = useState<Array<TenantMember>>([])
  const [loaded, setLoaded] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<{
    id: string
    url: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!tenantId) return
      const effectiveSignal = signal ?? new AbortController().signal
      // Read through a call, not the property: TypeScript narrows `aborted` to
      // false at the first check and does not reconsider across the awaits, so
      // the later checks - the ones that actually catch a cancellation - get
      // flagged as dead code they are not. Same note as useWeddingMembers.
      const isAborted = () => effectiveSignal.aborted

      const [invitationsRes, membersRes] = await Promise.all([
        supabase
          .from("tenant_invitations")
          .select("id, role, token, expires_at, claimed_at, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .abortSignal(effectiveSignal),
        supabase
          .from("tenant_members")
          .select("user_id, role, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
          .abortSignal(effectiveSignal),
      ])

      // Before the error checks: an aborted PostgREST request comes back as an
      // error *result*, not a silent no-op, so navigating away mid-fetch would
      // otherwise park an "AbortError" string in `error`.
      if (isAborted()) return

      if (invitationsRes.error || membersRes.error) {
        console.error("[crm] roster load failed", {
          invitations: invitationsRes.error,
          members: membersRes.error,
        })
        setError(i18n.t("crm.roster.load_failed"))
        setLoaded(true)
        return
      }

      const names = await fetchDisplayNames(
        membersRes.data.map((member) => member.user_id),
        effectiveSignal
      )

      if (isAborted()) return

      setError(null)
      setInvitations(invitationsRes.data as Array<TenantInvitation>)
      setMembers(
        membersRes.data.map((member) => ({
          ...(member as Omit<TenantMember, "display_name">),
          display_name: names.get(member.user_id) ?? null,
        }))
      )
      setLoaded(true)
    },
    [tenantId]
  )

  useEffect(() => {
    if (!tenantId) return
    const controller = new AbortController()
    // refresh() only setState()s after awaiting the fetch - a legitimate
    // external-data sync, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal)
    return () => controller.abort()
  }, [tenantId, refresh])

  const handleCreate = useCallback(async () => {
    if (!tenantId || !session || submitting) return
    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase
      .from("tenant_invitations")
      .insert({ tenant_id: tenantId, role, invited_by: session.user.id })

    if (insertError) {
      console.error("[crm] create invitation failed", insertError)
      setSubmitting(false)
      // The one refusal a staff member can actually provoke from this form is
      // the owner-only staff invite, and the RLS message for it is a PostgREST
      // policy string nobody should be shown. `canInviteStaff` already hides
      // the option, so this is the defence-in-depth path.
      setError(
        i18n.t(
          role === "staff" && !canInviteStaff
            ? "crm.roster.staff_owner_only"
            : "crm.roster.create_failed"
        )
      )
      return
    }

    // Role only - the token is a bearer credential and the invitation names
    // nobody until it is claimed.
    track("tenant_invite_created", { role })

    // Re-fetch to pick up the token the database generated.
    await refresh()
    setSubmitting(false)
    setRole("customer")
  }, [tenantId, session, submitting, role, canInviteStaff, refresh])

  const handleRevoke = useCallback(
    async (id: string) => {
      setError(null)
      const revoked = invitations.find((invitation) => invitation.id === id)
      setInvitations((list) => list.filter((i) => i.id !== id))

      const { error: revokeError } = await supabase
        .from("tenant_invitations")
        .delete()
        .eq("id", id)

      if (revokeError) {
        console.error("[crm] revoke invitation failed", revokeError)
        setInvitations((list) => {
          if (!revoked || list.some((i) => i.id === id)) return list
          return [...list, revoked].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
        })
        setError(i18n.t("crm.roster.revoke_failed"))
      }
    },
    [invitations]
  )

  const handleRemove = useCallback(
    async (member: TenantMember) => {
      if (!tenantId || member.role === "owner") return

      setError(null)
      setMembers((list) =>
        list.filter((item) => item.user_id !== member.user_id)
      )

      // `.select()` because a DELETE that RLS filters to nothing comes back a
      // clean 204 - no error, no rows. Treating that as success is the worst
      // outcome available: the optimistic removal above stands, the roster
      // shows them gone, and they still hold whatever the row granted.
      const { data, error: removeError } = await supabase
        .from("tenant_members")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("user_id", member.user_id)
        .select("user_id")

      if (removeError || data.length === 0) {
        console.error("[crm] remove member failed", {
          error: removeError,
          removed: data?.length ?? 0,
        })
        setMembers((list) => {
          if (list.some((item) => item.user_id === member.user_id)) return list
          return [...list, member].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
        })
        setError(i18n.t("crm.roster.remove_failed"))
      }
    },
    [tenantId]
  )

  const handleCopy = useCallback(
    async (invitation: TenantInvitation) => {
      // The origin is chosen by who the link is for, not by where it was
      // copied from. Sessions are per-origin: a couple's account lives on the
      // apex, staff sign in on the venue's own host, and handing either the
      // other's URL is a sign-in screen for no reason. This is the whole
      // reason apexOrigin/tenantOrigin exist rather than SITE_ORIGIN.
      const origin =
        invitation.role === "staff" && slug ? tenantOrigin(slug) : apexOrigin()
      const url = `${origin}/venue/invite/${invitation.token}`

      try {
        await navigator.clipboard.writeText(url)
        setCopiedId(invitation.id)
        setFallbackUrl(null)
        setTimeout(
          () => setCopiedId((v) => (v === invitation.id ? null : v)),
          1500
        )
      } catch {
        // Clipboard API unavailable - surface the URL so it can be copied by
        // hand rather than lost.
        setFallbackUrl({ id: invitation.id, url })
      }
    },
    [slug]
  )

  return {
    canInviteStaff,
    role,
    setRole,
    submitting,
    loaded,
    // Claimed rows stay in the table as a record of how someone joined, but
    // they are not revocable and not copyable - the membership they created is
    // what matters now, and that is in the member list.
    pending: invitations.filter((i) => !i.claimed_at),
    members,
    error,
    copiedId,
    fallbackUrl,
    currentUserId: session?.user.id,
    handleCreate,
    handleRevoke,
    handleRemove,
    handleCopy,
  }
}
