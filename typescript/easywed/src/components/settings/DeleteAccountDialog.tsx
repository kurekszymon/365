import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { AlertTriangleIcon } from "lucide-react"
import type { SharedWedding } from "@/lib/sync/account"
import { deleteOwnAccount, fetchSharedOwnedWeddings } from "@/lib/sync/account"
import { useAuthStore } from "@/stores/auth.store"
import { supabase } from "@/lib/supabase"
import { matchesConfirmWord } from "@/lib/confirmWord"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { ConfirmWordField } from "@/components/dialogs/shared/ConfirmWordField"
import { Button } from "@/components/ui/button"

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteAccountDialog = ({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.session?.user.id)

  const [blocking, setBlocking] = useState<Array<SharedWedding> | null>(null)
  const [confirmation, setConfirmation] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Re-checked every time the dialog opens: the user may have just removed the
  // members that were in the way, and a stale "blocked" screen would send them
  // in circles.
  useEffect(() => {
    if (!open) return

    // No user id while the dialog is open means the session went away under us
    // (/settings is auth-guarded, so this takes an expiry race). Returning
    // early would leave `blocking` null forever - the dialog stuck on
    // "checking your weddings", with no button, no error and no retry. Same
    // exit as a failed check below.
    if (!userId) {
      toast.error(t("settings.delete.check_failed"))
      onOpenChange(false)
      return
    }

    const controller = new AbortController()

    fetchSharedOwnedWeddings(userId, controller.signal)
      .then((weddings) => {
        if (controller.signal.aborted) return
        setBlocking(weddings)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        // Unknown state is not a safe state for an irreversible action, so
        // fail closed: an empty list here would render the delete button.
        toast.error(t("settings.delete.check_failed"))
        onOpenChange(false)
      })

    return () => controller.abort()
  }, [open, userId, t, onOpenChange])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    const result = await deleteOwnAccount()

    if (!result.ok) {
      // The server refused because someone gained access between the check on
      // open and this click - a co-member joining in another tab, or an invite
      // claimed in the window the RPC's row lock narrows but can't close. A
      // toast alone would leave the confirm field and an enabled button on
      // screen with nothing naming what's in the way, so re-query and switch
      // the dialog into its blocked state instead.
      //
      // `deleting` stays true across the re-query: clearing it first would
      // re-arm the destructive button for the length of that round trip, in
      // the one state where we already know the next click would also fail.
      if (result.reason === "shared_weddings" && userId) {
        const weddings = await fetchSharedOwnedWeddings(userId).catch(
          () => null
        )

        if (weddings && weddings.length > 0) {
          setBlocking(weddings)
          setDeleting(false)
          toast.error(t("settings.delete.blocked_title"))
          return
        }
        // Refused, yet nothing blocking came back: whoever joined has already
        // left again, or the re-query failed. Either way we can't name the
        // obstacle, so don't claim to - the generic message is the honest one.
      }

      setDeleting(false)
      toast.error(t("settings.delete.failed"))
      return
    }

    // Leave /settings before dropping the session, not after. signOut fires
    // SIGNED_OUT, AuthGate calls router.invalidate(), and this route's
    // requireAuth("/settings") would redirect to /login?next=/settings -
    // racing the navigate below and stranding a just-deleted user on a login
    // page pointing at a route they no longer have.
    await navigate({ to: i18n.resolvedLanguage === "pl" ? "/pl" : "/en" })

    // Local scope only: the user row is already gone, so a server-side
    // revocation would just 401 on the way out.
    await supabase.auth.signOut({ scope: "local" })
  }, [t, i18n.resolvedLanguage, navigate, userId])

  const isBlocked = blocking !== null && blocking.length > 0
  const confirmWord = t("common.confirm_word")
  const canDelete =
    blocking !== null &&
    !isBlocked &&
    !deleting &&
    matchesConfirmWord(confirmation, confirmWord)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setConfirmation("")
          setBlocking(null)
        }
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isBlocked
              ? t("settings.delete.blocked_title")
              : t("settings.delete.title")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isBlocked
              ? t("settings.delete.blocked_body")
              : t("settings.delete.body")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          {blocking === null && (
            <p className="text-sm text-muted-foreground">
              {t("settings.delete.checking")}
            </p>
          )}

          {isBlocked && (
            <ul className="flex flex-col gap-2">
              {blocking.map((wedding) => (
                <li
                  key={wedding.id}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <AlertTriangleIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {wedding.name || t("wedding")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("settings.delete.other_members", {
                      count: wedding.otherMembers,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {blocking !== null && !isBlocked && (
            <ConfirmWordField
              id="delete-confirmation"
              word={confirmWord}
              value={confirmation}
              onChange={setConfirmation}
            />
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline">{t("common.cancel")}</Button>
          </ResponsiveDialogClose>
          {blocking !== null && !isBlocked && (
            <Button
              variant="destructive"
              disabled={!canDelete}
              onClick={() => void handleDelete()}
            >
              {t("settings.delete.confirm")}
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
