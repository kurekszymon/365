import { useCallback, useEffect, useState } from "react"

import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"

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
}

/**
 * Owns all member/invitation state and the inline Supabase calls for the
 * WeddingMembersDialog. The dialog and its subcomponents stay presentational;
 * everything that touches the DB (or local UI state tied to it) lives here.
 */
export function useWeddingMembers(isOpen: boolean) {
  const weddingId = useGlobalStore((s) => s.weddingId)
  const session = useAuthStore((s) => s.session)

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

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!weddingId) return
      const [invitationsRes, membersRes] = await Promise.all([
        supabase
          .from("wedding_invitations")
          .select(
            "id, role, token, expires_at, claimed_at, claimed_by, created_at"
          )
          .eq("wedding_id", weddingId)
          .order("created_at", { ascending: false })
          .abortSignal(signal ?? new AbortController().signal),
        supabase
          .from("wedding_members")
          .select("user_id, role, created_at")
          .eq("wedding_id", weddingId)
          .order("created_at", { ascending: true })
          .abortSignal(signal ?? new AbortController().signal),
      ])

      if (invitationsRes.error) {
        setError(invitationsRes.error.message)
        return
      }
      if (membersRes.error) {
        setError(membersRes.error.message)
        return
      }

      setError(null)
      setInvitations(invitationsRes.data as Array<Invitation>)
      setMembers(membersRes.data as Array<MemberAccess>)
    },
    [weddingId]
  )

  useEffect(() => {
    if (!isOpen || !weddingId) return
    const controller = new AbortController()
    // refresh() only setState()s after awaiting the fetch — a legitimate
    // external-data sync, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal)
    return () => controller.abort()
  }, [isOpen, weddingId, refresh])

  const handleCreate = useCallback(async () => {
    if (!weddingId || !session || submitting) return
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
  }, [weddingId, session, submitting, role, refresh])

  const handleRevoke = useCallback(
    async (id: string) => {
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

      setMembers((list) =>
        list.filter((item) => item.user_id !== member.user_id)
      )

      // Delete membership first — that's the critical access revocation step.
      // Only delete the invitation row after membership is confirmed gone, so
      // we never end up with access still granted but no visible row to revoke.
      const memberRes = await supabase
        .from("wedding_members")
        .delete()
        .eq("wedding_id", weddingId)
        .eq("user_id", member.user_id)

      if (memberRes.error) {
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
        setError(memberRes.error.message)
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
      // Clipboard API unavailable — surface the URL so the owner can copy manually.
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
