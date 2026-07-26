import { useTranslation } from "react-i18next"

import { useWeddingMembers } from "./useWeddingMembers"
import { InvitationManager } from "./InvitationManager"
import { MembersUpgradeNotice } from "./MembersUpgradeNotice"
import { MemberList } from "./MemberList"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"

import { useDialogStore } from "@/stores/dialog.store"

export const WeddingMembersDialog = () => {
  const { t } = useTranslation()
  const opened = useDialogStore((s) => s.opened)
  const close = useDialogStore((s) => s.close)

  const isOpen = opened === "Wedding.Members"

  const {
    canInvite,
    role,
    setRole,
    submitting,
    pending,
    members,
    error,
    copiedId,
    fallbackUrl,
    currentUserId,
    handleCreate,
    handleRevoke,
    handleRemoveAccess,
    handleCopy,
    reset,
  } = useWeddingMembers(isOpen)

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) {
          close()
          reset()
        }
      }}
    >
      <ResponsiveDialogContent
        className="sm:max-w-md"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("members.title")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          {canInvite ? (
            <InvitationManager
              role={role}
              setRole={setRole}
              submitting={submitting}
              error={error}
              pending={pending}
              copiedId={copiedId}
              fallbackUrl={fallbackUrl}
              onCreate={handleCreate}
              onRevoke={handleRevoke}
              onCopy={handleCopy}
            />
          ) : (
            <MembersUpgradeNotice />
          )}

          {/* Stays mounted on the free plan: the list is empty there (no rows
              are fetched), so it renders nothing - but a future paid gate on a
              cloud wedding would still show the existing members read-only. */}
          <MemberList
            members={members}
            currentUserId={currentUserId}
            onRemoveAccess={handleRemoveAccess}
          />
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline">{t("common.close")}</Button>
          </ResponsiveDialogClose>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
