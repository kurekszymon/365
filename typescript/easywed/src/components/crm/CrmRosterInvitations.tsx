import { useTranslation } from "react-i18next"
import { CheckIcon, CopyIcon, TrashIcon } from "lucide-react"

import type { TenantInvitation } from "./useTenantRoster"
import { Button } from "@/components/ui/button"

/**
 * Unclaimed invitations, with the link and a way to withdraw it.
 *
 * The token is only ever put on the clipboard, never rendered - it is a bearer
 * credential, and a CRM left open on a screen in a venue office is not a
 * private place. The clipboard-unavailable fallback shows the URL because at
 * that point there is no other way to pass it on; that is a deliberate trade,
 * not an oversight.
 *
 * Expired rows stay listed rather than being filtered out. An invitation that
 * quietly vanished would read as "I never sent it" and get sent again, which is
 * exactly the loop the venue is trying to escape when a couple says the link
 * did not work.
 */
export const CrmRosterInvitations = ({
  invitations,
  copiedId,
  fallbackUrl,
  onCopy,
  onRevoke,
}: {
  invitations: Array<TenantInvitation>
  copiedId: string | null
  fallbackUrl: { id: string; url: string } | null
  onCopy: (invitation: TenantInvitation) => void
  onRevoke: (id: string) => void
}) => {
  const { t, i18n } = useTranslation()

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("crm.roster.invitations_empty")}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {invitations.map((invitation) => {
        const expired = new Date(invitation.expires_at) <= new Date()

        return (
          <li
            key={invitation.id}
            className="flex flex-col gap-1 rounded-md border p-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">
                  {t(`crm.role.${invitation.role}`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {expired
                    ? t("crm.roster.expired")
                    : t("crm.roster.expires", {
                        date: new Date(
                          invitation.expires_at
                        ).toLocaleDateString(i18n.language),
                      })}
                </span>
              </div>

              {/* No point copying a link that will refuse itself with PT404. */}
              {expired ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopy(invitation)}
                >
                  {copiedId === invitation.id ? (
                    <>
                      <CheckIcon />
                      {t("crm.roster.copied")}
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      {t("crm.roster.copy_link")}
                    </>
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRevoke(invitation.id)}
                aria-label={t("crm.roster.revoke")}
              >
                <TrashIcon />
              </Button>
            </div>

            {fallbackUrl?.id === invitation.id && (
              <input
                readOnly
                value={fallbackUrl.url}
                className="w-full truncate rounded border bg-muted px-2 py-1 text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
