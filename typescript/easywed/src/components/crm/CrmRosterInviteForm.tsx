import { useTranslation } from "react-i18next"

import type { TenantInviteRole } from "./useTenantRoster"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Issue an invitation link.
 *
 * The role select collapses to a fixed label when the caller is not the owner,
 * because only an owner may invite `staff` (see the INSERT policy in
 * 20260820000001). Hiding the option rather than showing it and refusing the
 * insert is the honest shape: the alternative offers a choice the database will
 * not honour.
 */
export const CrmRosterInviteForm = ({
  role,
  setRole,
  canInviteStaff,
  submitting,
  onCreate,
}: {
  role: TenantInviteRole
  setRole: (role: TenantInviteRole) => void
  canInviteStaff: boolean
  submitting: boolean
  onCreate: () => void
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4 sm:max-w-md">
      <Field>
        <FieldLabel htmlFor="tenant-invite-role">
          {t("crm.roster.invite_role")}
        </FieldLabel>
        {canInviteStaff ? (
          <Select
            value={role}
            onValueChange={(v) => setRole(v as TenantInviteRole)}
          >
            <SelectTrigger id="tenant-invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">{t("crm.role.customer")}</SelectItem>
              <SelectItem value="staff">{t("crm.role.staff")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm">{t("crm.role.customer")}</p>
        )}
        <FieldDescription>
          {t(
            role === "staff"
              ? "crm.roster.invite_help_staff"
              : "crm.roster.invite_help_customer"
          )}
        </FieldDescription>
      </Field>

      <Button onClick={onCreate} disabled={submitting} className="self-start">
        {t("crm.roster.create_invite")}
      </Button>
    </div>
  )
}
