import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useAuthStore } from "@/stores/auth.store"
import { useTenantStore } from "@/stores/tenant.store"
import { supabase } from "@/lib/supabase"
import { fetchDisplayNames } from "@/lib/sync/profile"
import { apexOrigin, tenantUrl } from "@/lib/tenant/host"
import { track } from "@/lib/analytics/track"

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
 * Modelled on `useWeddingMembers`: the same screen for two different trees, with
 * no guest-mode branch, since a venue has no local equivalent.
 *
 * The security-relevant asymmetries all live in the database (20260820000001);
 * this hook mirrors them so the UI is honest:
 *
 *   - only an owner may invite `staff`, so `canInviteStaff` hides the option
 *     for a plain staff member rather than letting them hit an RLS refusal;
 *   - `owner` rows carry no remove button, because both DELETE policies
 *     exclude them;
 *   - removing a member does *not* touch any wedding they linked. Membership
 *     and `venue_access` are separate decisions with separate RPCs.
 */
export function useTenantRoster(tenantId: string | undefined) {
  const { t } = useTranslation()
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
  /**
   * The *key* of the current failure, not its sentence: state outlives a
   * language switch, so translating at the point of failure would freeze the
   * banner in the language current when the write was refused. Same rule as
   * `useTenantMenus`.
   */
  const [errorKey, setErrorKey] = useState<string | null>(null)

  // The load effect's controller, kept where the handlers can reach it: a
  // refresh fired from one has to be cancellable by the unmount that cancels the
  // initial load, and `refresh()` with no signal gets a controller nothing aborts.
  const loadController = useRef<AbortController | null>(null)

  // Cleared on unmount and at the top of each copy, so a second copy does not
  // leave the first timer racing it - same shape as CrmConfirmButton's.
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => void (copyTimer.current && clearTimeout(copyTimer.current)),
    []
  )

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!tenantId) return
      const effectiveSignal = signal ?? new AbortController().signal
      // Read through a call, not the property: TypeScript narrows `aborted` to
      // false at the first check and does not reconsider across awaits, so the
      // later checks - the ones that catch a cancellation - read as dead code.
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
      // error *result*, so navigating away mid-fetch would otherwise park an
      // "AbortError" string in `error`.
      if (isAborted()) return

      if (invitationsRes.error || membersRes.error) {
        console.error("[crm] roster load failed", {
          invitations: invitationsRes.error,
          members: membersRes.error,
        })
        setErrorKey("crm.roster.load_failed")
        setLoaded(true)
        return
      }

      const names = await fetchDisplayNames(
        membersRes.data.map((member) => member.user_id),
        effectiveSignal
      )

      if (isAborted()) return

      setErrorKey(null)
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
    loadController.current = controller
    // refresh() only setState()s after awaiting the fetch - a legitimate
    // external-data sync, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal)
    return () => {
      controller.abort()
      loadController.current = null
    }
  }, [tenantId, refresh])

  const handleCreate = useCallback(async () => {
    if (!tenantId || !session || submitting) return
    setSubmitting(true)
    setErrorKey(null)

    const { error: insertError } = await supabase
      .from("tenant_invitations")
      .insert({ tenant_id: tenantId, role, invited_by: session.user.id })

    if (insertError) {
      console.error("[crm] create invitation failed", insertError)
      setSubmitting(false)
      // The one refusal a staff member can provoke from this form is the
      // owner-only staff invite, whose RLS message is a PostgREST policy string
      // nobody should see. `canInviteStaff` hides the option; this is depth.
      setErrorKey(
        role === "staff" && !canInviteStaff
          ? "crm.roster.staff_owner_only"
          : "crm.roster.create_failed"
      )
      return
    }

    // Role only - the token is a bearer credential and the invitation names
    // nobody until it is claimed.
    track("tenant_invite_created", { role })

    // Re-fetch to pick up the token the database generated, on the load effect's
    // signal so navigating away mid-refresh cancels it rather than landing a
    // roster on an unmounted screen.
    const signal = loadController.current?.signal
    await refresh(signal)
    if (signal?.aborted) return

    setSubmitting(false)
    setRole("customer")
  }, [tenantId, session, submitting, role, canInviteStaff, refresh])

  const handleRevoke = useCallback(
    async (id: string) => {
      setErrorKey(null)
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
        setErrorKey("crm.roster.revoke_failed")
      }
    },
    [invitations]
  )

  const handleRemove = useCallback(
    async (member: TenantMember) => {
      if (!tenantId || member.role === "owner") return

      setErrorKey(null)
      setMembers((list) =>
        list.filter((item) => item.user_id !== member.user_id)
      )

      // `.select()` because a DELETE that RLS filters to nothing comes back a
      // clean 204. Treating that as success leaves the optimistic removal
      // standing - the roster shows them gone, and they still hold the row.
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
        setErrorKey("crm.roster.remove_failed")
      }
    },
    [tenantId]
  )

  const handleCopy = useCallback(
    async (invitation: TenantInvitation) => {
      // The origin is chosen by who the link is for, not by where it was copied
      // from. Sessions are per-origin: a couple's account lives on the apex,
      // staff sign in on the venue's host, and handing either the other's URL is
      // a sign-in screen for no reason - which is why apexOrigin/tenantUrl exist.
      const path = `/venue/invite/${invitation.token}`
      const url =
        invitation.role === "staff" && slug
          ? tenantUrl(slug, path)
          : `${apexOrigin()}${path}`

      try {
        await navigator.clipboard.writeText(url)
        if (copyTimer.current) clearTimeout(copyTimer.current)
        setCopiedId(invitation.id)
        setFallbackUrl(null)
        copyTimer.current = setTimeout(
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
    // Claimed rows stay as a record of how someone joined, but are neither
    // revocable nor copyable - the membership they created is what matters now,
    // and that is in the member list.
    pending: invitations.filter((i) => !i.claimed_at),
    members,
    /** The current failure as a sentence, resolved in the current language. */
    error: errorKey ? t(errorKey) : null,
    copiedId,
    fallbackUrl,
    currentUserId: session?.user.id,
    handleCreate,
    handleRevoke,
    handleRemove,
    handleCopy,
  }
}
