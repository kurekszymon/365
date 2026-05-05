import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  CheckIcon,
  CopyIcon,
  ShareIcon,
  TrashIcon,
  UserXIcon,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useDialogStore } from "@/stores/dialog.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"

type InviteRole = "editor" | "viewer"
type MemberRole = "owner" | InviteRole

type Invitation = {
  id: string
  role: InviteRole
  token: string
  expires_at: string
  claimed_at: string | null
  claimed_by: string | null
  created_at: string
}

type MemberAccess = {
  user_id: string
  role: MemberRole
  created_at: string
}

type TransferState =
  | { kind: "idle" }
  | { kind: "confirm"; memberId: string; alreadyHasWedding: boolean }
  | { kind: "transferring" }

export const WeddingMembersDialog = () => {
  const { t } = useTranslation()
  const opened = useDialogStore((s) => s.opened)
  const close = useDialogStore((s) => s.close)
  const weddingId = useGlobalStore((s) => s.weddingId)
  const setGlobalRole = useGlobalStore((s) => s.setRole)
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
  const [transferState, setTransferState] = useState<TransferState>({
    kind: "idle",
  })

  const isOpen = opened === "Wedding.Members"

  useEffect(() => {
    if (!isOpen || !weddingId) return
    const controller = new AbortController()
    void refresh(
      weddingId,
      controller.signal,
      setInvitations,
      setMembers,
      setError
    )
    return () => controller.abort()
  }, [isOpen, weddingId])

  const handleCreate = async () => {
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
    await refresh(
      weddingId,
      new AbortController().signal,
      setInvitations,
      setMembers,
      setError
    )
    setSubmitting(false)
    setRole("editor")
  }

  const handleRevoke = async (id: string) => {
    const prev = invitations
    setInvitations((list) => list.filter((i) => i.id !== id))

    const { error: revokeError } = await supabase
      .from("wedding_invitations")
      .delete()
      .eq("id", id)

    if (revokeError) {
      setInvitations(prev)
      setError(revokeError.message)
    }
  }

  const handleRemoveAccess = async (member: MemberAccess) => {
    if (
      !weddingId ||
      !session ||
      member.role === "owner" ||
      member.user_id === session.user.id
    ) {
      return
    }

    const prevMembers = members
    setMembers((list) => list.filter((item) => item.user_id !== member.user_id))

    // Delete membership first — that's the critical access revocation step.
    // Only delete the invitation row after membership is confirmed gone, so
    // we never end up with access still granted but no visible row to revoke.
    const memberRes = await supabase
      .from("wedding_members")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("user_id", member.user_id)

    if (memberRes.error) {
      setMembers(prevMembers)
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
  }

  const handleCopy = async (invitation: Invitation) => {
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
  }

  const handleTransferClick = async (member: MemberAccess) => {
    if (!weddingId) return

    // Check whether the target already has a wedding (owns one or is a couple
    // with an existing wedding). We check wedding ownership as a proxy.
    const { count } = await supabase
      .from("weddings")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", member.user_id)

    setTransferState({
      kind: "confirm",
      memberId: member.user_id,
      alreadyHasWedding: (count ?? 0) > 0,
    })
  }

  const handleTransferConfirm = async () => {
    if (transferState.kind !== "confirm" || !weddingId) return
    const { memberId } = transferState
    setTransferState({ kind: "transferring" })
    setError(null)

    const { error: rpcError } = await supabase.rpc(
      "transfer_wedding_ownership",
      {
        _wedding_id: weddingId,
        _to_user_id: memberId,
      }
    )

    if (rpcError) {
      setError(rpcError.message)
      setTransferState({ kind: "idle" })
      return
    }

    // Reload members to reflect the new roles.
    await refresh(
      weddingId,
      new AbortController().signal,
      setInvitations,
      setMembers,
      setError
    )
    // Demote the current user in the global store so owner-only controls
    // (e.g. the Members button) disappear immediately without a page reload.
    setGlobalRole("editor")
    setTransferState({ kind: "idle" })
  }

  const pending = invitations.filter((i) => !i.claimed_at)

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) {
            close()
            setRole("editor")
            setError(null)
            setCopiedId(null)
            setFallbackUrl(null)
            setTransferState({ kind: "idle" })
          }
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("members.title")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="invite-role">{t("members.role")}</FieldLabel>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as InviteRole)}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    {t("members.role.editor")}
                  </SelectItem>
                  <SelectItem value="viewer">
                    {t("members.role.viewer")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={handleCreate} disabled={submitting}>
              {t("members.create_invite")}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t("members.pending")}
              </p>
              <ul className="flex flex-col gap-2">
                {pending.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-1 rounded-md border p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">
                          {t("members.link_only")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(`members.role.${inv.role}`)} &middot;{" "}
                          {t("members.expires", {
                            date: new Date(inv.expires_at).toLocaleDateString(),
                          })}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(inv)}
                      >
                        {copiedId === inv.id ? (
                          <>
                            <CheckIcon />
                            {t("members.copied")}
                          </>
                        ) : (
                          <>
                            <CopyIcon />
                            {t("members.copy_link")}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevoke(inv.id)}
                        aria-label={t("members.revoke")}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                    {fallbackUrl?.id === inv.id && (
                      <input
                        readOnly
                        value={fallbackUrl.url}
                        className="w-full truncate rounded border bg-muted px-2 py-1 text-xs"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {members.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t("members.active")}
              </p>
              <ul className="flex flex-col gap-2">
                {members.map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">
                        {getMemberLabel(member, session?.user.id, t)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(`members.role.${member.role}`)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {member.role === "editor" &&
                        member.user_id !== session?.user.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTransferClick(member)}
                            aria-label={t("members.transfer")}
                            title={t("members.transfer")}
                          >
                            <ShareIcon />
                          </Button>
                        )}
                      {member.role !== "owner" &&
                        member.user_id !== session?.user.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAccess(member)}
                            aria-label={t("members.remove_access")}
                          >
                            <UserXIcon />
                          </Button>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer ownership confirmation dialog */}
      <Dialog
        open={transferState.kind === "confirm"}
        onOpenChange={(next) => {
          if (!next) setTransferState({ kind: "idle" })
        }}
      >
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("members.transfer_confirm_title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {transferState.kind === "confirm" && transferState.alreadyHasWedding
              ? t("members.transfer_confirm_has_wedding")
              : t("members.transfer_confirm")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferState({ kind: "idle" })}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleTransferConfirm}>
              {t("members.transfer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

async function refresh(
  weddingId: string,
  signal: AbortSignal,
  setInvitations: (xs: Array<Invitation>) => void,
  setMembers: (xs: Array<MemberAccess>) => void,
  setError: (e: string | null) => void
) {
  const [invitationsRes, membersRes] = await Promise.all([
    supabase
      .from("wedding_invitations")
      .select("id, role, token, expires_at, claimed_at, claimed_by, created_at")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .abortSignal(signal),
    supabase
      .from("wedding_members")
      .select("user_id, role, created_at")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .abortSignal(signal),
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
}

function getMemberLabel(
  member: MemberAccess,
  currentUserId: string | undefined,
  t: (key: string) => string
) {
  if (member.user_id === currentUserId) {
    return t("members.you")
  }

  return `${t("members.member")} ${member.user_id.slice(0, 8)}`
}
