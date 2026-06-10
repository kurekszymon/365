import { useTranslation } from "react-i18next"

import { useWeddingMembers } from "./useWeddingMembers"
import { InvitationManager } from "./InvitationManager"
import { MemberList } from "./MemberList"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { useDialogStore } from "@/stores/dialog.store"

export const WeddingMembersDialog = () => {
  const { t } = useTranslation()
  const opened = useDialogStore((s) => s.opened)
  const close = useDialogStore((s) => s.close)

  const isOpen = opened === "Wedding.Members"

  const {
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
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) {
          close()
          reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("members.title")}</DialogTitle>
        </DialogHeader>

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

        <MemberList
          members={members}
          currentUserId={currentUserId}
          onRemoveAccess={handleRemoveAccess}
        />

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
