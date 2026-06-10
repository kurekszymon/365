import { useTranslation } from "react-i18next"
import { CheckIcon, CopyIcon, TrashIcon } from "lucide-react"

import type { Invitation, InviteRole } from "./useWeddingMembers"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface InvitationManagerProps {
  role: InviteRole
  setRole: (role: InviteRole) => void
  submitting: boolean
  error: string | null
  pending: Array<Invitation>
  copiedId: string | null
  fallbackUrl: { id: string; url: string } | null
  onCreate: () => void
  onRevoke: (id: string) => void
  onCopy: (invitation: Invitation) => void
}

export const InvitationManager = ({
  role,
  setRole,
  submitting,
  error,
  pending,
  copiedId,
  fallbackUrl,
  onCreate,
  onRevoke,
  onCopy,
}: InvitationManagerProps) => {
  const { t } = useTranslation()

  return (
    <>
      <div className="flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="invite-role">{t("members.role")}</FieldLabel>
          <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">{t("members.role.editor")}</SelectItem>
              <SelectItem value="viewer">{t("members.role.viewer")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Button onClick={onCreate} disabled={submitting}>
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
                    onClick={() => onCopy(inv)}
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
                    onClick={() => onRevoke(inv.id)}
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
    </>
  )
}
