import { useCallback, useEffect, useState } from "react"

import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { fetchDisplayNames } from "@/lib/sync/profile"
import { isLocalWedding } from "@/lib/localWedding"
import i18n from "@/i18n"

export type InviteRole = "editor" | "viewer"
export type MemberRole = "owner" | InviteRole

export type Invitation = {
  id: string
  role: InviteRole
  token: string
  expires_at: string
  claimed_at: string | null
  claimed_by: string | null
  created_at: string
}

export type MemberAccess = {
  user_id: string
  role: MemberRole
  created_at: string
  display_name: string | null
}

/**
 * Owns all member/invitation state and the inline Supabase calls for the
 * WeddingMembersDialog. The dialog and its subcomponents stay presentational;
 * everything that touches the DB (or local UI state tied to it) lives here.
 */
export function useWeddingMembers(isOpen: boolean) {
  const weddingId = useGlobalStore((s) => s.weddingId)
  const session = useAuthStore((s) => s.session)
  // Editors and viewers open the same dialog from the header avatar stack,
  // but only owners get the invite form and the revoke buttons - RLS enforces
  // that server-side, so this only keeps the UI honest about it.
  const isOwner = useGlobalStore((s) => s.role) === "owner"

  const [role, setRole] = useState<InviteRole>("editor")
  const [submitting, setSubmitting] = useState(false)
  const [invitations, setInvitations] = useState<Array<Invitation>>([])
  const [members, setMembers] = useState<Array<MemberAccess>>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<{
    id: string
    url: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Free plan = guest mode: a device-local wedding has no Supabase row, so
  // there is nothing to attach members or invitations to. Signing in (which
  // migrates the plan to an account) is the upgrade path - see
  // MembersUpgradeNotice. Every DB call below is gated on this, so the
  // dialog never fires a query with the "local" sentinel as a wedding id.
  const canInvite = Boolean(session) && !isLocalWedding(weddingId)

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!weddingId || !canInvite) return
      const effectiveSignal = signal ?? new AbortController().signal
      // Read through a call, not the property. TypeScript narrows `aborted` to
      // false at the first check and doesn't reconsider across the awaits that
      // follow, so the later checks - the ones that actually catch a
      // cancellation - get flagged as dead code they aren't.
      const isAborted = () => effectiveSignal.aborted
      const [invitationsRes, membersRes] = await Promise.all([
        supabase
          .from("wedding_invitations")
          .select(
            "id, role, token, expires_at, claimed_at, claimed_by, created_at"
          )
          .eq("wedding_id", weddingId)
          .order("created_at", { ascending: false })
          .abortSignal(effectiveSignal),
        supabase
          .from("wedding_members")
          .select("user_id, role, created_at")
          .eq("wedding_id", weddingId)
          .order("created_at", { ascending: true })
          .abortSignal(effectiveSignal),
      ])

      // Has to come before the error checks: an aborted PostgREST request
      // comes back as an error *result*, not a silent no-op, so closing the
      // dialog mid-fetch would otherwise park an "AbortError" string in
      // `error` for the next time it opens.
      if (isAborted()) return

      if (invitationsRes.error) {
        setError(invitationsRes.error.message)
        return
      }
      if (membersRes.error) {
        setError(membersRes.error.message)
        return
      }

      const names = await fetchDisplayNames(
        membersRes.data.map((member) => member.user_id),
        effectiveSignal
      )

      // Second await, second chance to have been cancelled in the meantime.
      if (isAborted()) return

      const nextMembers = membersRes.data.map((member) => ({
        ...(member as Omit<MemberAccess, "display_name">),
        display_name: names.get(member.user_id) ?? null,
      }))

      setError(null)
      setInvitations(invitationsRes.data as Array<Invitation>)
      setMembers(nextMembers)

      // The header avatar stack reads global.store, which is otherwise only
      // written by loadWedding - so it's a snapshot from page load and goes
      // stale the moment anyone joins or leaves in another session. This is
      // the same list, freshly fetched, so hand it over: opening the dialog
      // doubles as the stack's refresh.
      //
      // Same guard loadWedding puts on its own member write, and it earns its
      // keep here for a reason the abort checks above don't cover: refresh()
      // is also called without a signal after an invite is created or revoked,
      // so nothing would otherwise stop a slow round trip for the previous
      // wedding landing on the current one's stack.
      if (useGlobalStore.getState().weddingId !== weddingId) return

      useGlobalStore.setState({
        members: nextMembers.map((member) => ({
          userId: member.user_id,
          role: member.role,
          displayName: member.display_name,
        })),
      })
    },
    [weddingId, canInvite]
  )

  useEffect(() => {
    if (!isOpen || !weddingId) return
    const controller = new AbortController()
    // refresh() only setState()s after awaiting the fetch - a legitimate
    // external-data sync, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal)
    return () => controller.abort()
  }, [isOpen, weddingId, refresh])

  const handleCreate = useCallback(async () => {
    if (!weddingId || !session || submitting || !canInvite) return
    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase
      .from("wedding_invitations")
      .insert({
        wedding_id: weddingId,
        role,
        invited_by: session.user.id,
      })

    if (insertError) {
      setSubmitting(false)
      setError(insertError.message)
      return
    }

    // Re-fetch to get the token the DB generated.
    await refresh()
    setSubmitting(false)
    setRole("editor")
  }, [weddingId, session, submitting, canInvite, role, refresh])

  const handleRevoke = useCallback(
    async (id: string) => {
      setError(null)
      const revokedInvitation = invitations.find(
        (invitation) => invitation.id === id
      )
      setInvitations((list) => list.filter((i) => i.id !== id))

      const { error: revokeError } = await supabase
        .from("wedding_invitations")
        .delete()
        .eq("id", id)

      if (revokeError) {
        setInvitations((list) => {
          if (
            !revokedInvitation ||
            list.some((invitation) => invitation.id === id)
          ) {
            return list
          }
          return [...list, revokedInvitation].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
        })
        setError(revokeError.message)
      }
    },
    [invitations]
  )

  const handleRemoveAccess = useCallback(
    async (member: MemberAccess) => {
      if (
        !weddingId ||
        !session ||
        member.role === "owner" ||
        member.user_id === session.user.id
      ) {
        return
      }

      setError(null)
      setMembers((list) =>
        list.filter((item) => item.user_id !== member.user_id)
      )
      // Keep the header avatar stack in step with the dialog - it reads the
      // list loaded with the wedding, which this removal invalidates.
      useGlobalStore.setState((state) => ({
        members: state.members.filter((m) => m.userId !== member.user_id),
      }))

      // Delete membership first - that's the critical access revocation step.
      // Only delete the invitation row after membership is confirmed gone, so
      // we never end up with access still granted but no visible row to revoke.
      //
      // `.select()` because a DELETE that RLS filters to nothing comes back as
      // a clean 204 - no error, no rows. Treating that as success is the worst
      // outcome available here: the optimistic removal above stands, both the
      // dialog and the header stack show the member gone, and they still have
      // full access to the wedding.
      const memberRes = await supabase
        .from("wedding_members")
        .delete()
        .eq("wedding_id", weddingId)
        .eq("user_id", member.user_id)
        .select("user_id")

      if (memberRes.error || memberRes.data.length === 0) {
        setMembers((list) => {
          if (list.some((item) => item.user_id === member.user_id)) {
            return list
          }
          return [...list, member].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
        })
        // Put them back in the header stack too, or the optimistic removal
        // above would outlive the failure it was predicting.
        useGlobalStore.setState((state) =>
          state.members.some((m) => m.userId === member.user_id)
            ? state
            : {
                members: [
                  ...state.members,
                  {
                    userId: member.user_id,
                    role: member.role,
                    displayName: member.display_name,
                  },
                ],
              }
        )
        console.error("[members] remove access failed", {
          error: memberRes.error,
          removed: memberRes.data?.length ?? 0,
        })
        setError(memberRes.error?.message ?? i18n.t("members.remove_failed"))
        return
      }

      const claimedInvitation = invitations.find(
        (invitation) => invitation.claimed_by === member.user_id
      )

      if (!claimedInvitation) {
        return
      }

      const inviteRes = await supabase
        .from("wedding_invitations")
        .delete()
        .eq("id", claimedInvitation.id)

      if (inviteRes.error) {
        // Membership already removed; invitation row is stale but harmless
        // (it's burned / claimed_at is set so it can't be re-used).
        // Still show the error so the owner knows cleanup was partial.
        setError(inviteRes.error.message)
      }
    },
    [weddingId, session, invitations]
  )

  const handleCopy = useCallback(async (invitation: Invitation) => {
    const url = `${window.location.origin}/invite/${invitation.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(invitation.id)
      setFallbackUrl(null)
      setTimeout(
        () => setCopiedId((v) => (v === invitation.id ? null : v)),
        1500
      )
    } catch {
      // Clipboard API unavailable - surface the URL so the owner can copy manually.
      setFallbackUrl({ id: invitation.id, url })
    }
  }, [])

  const reset = useCallback(() => {
    setSubmitting(false)
    setRole("editor")
    setError(null)
    setCopiedId(null)
    setFallbackUrl(null)
  }, [])

  const pending = invitations.filter((i) => !i.claimed_at)

  return {
    canInvite,
    isOwner,
    role,
    setRole,
    submitting,
    pending,
    members,
    error,
    copiedId,
    fallbackUrl,
    currentUserId: session?.user.id,
    handleCreate,
    handleRevoke,
    handleRemoveAccess,
    handleCopy,
    reset,
  }
}
