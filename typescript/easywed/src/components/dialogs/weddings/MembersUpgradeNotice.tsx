import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// Rendered instead of InvitationManager on the free plan (guest mode). A
// device-local wedding has no Supabase row, so there is nothing to attach a
// member or an invitation to - signing in, which migrates the plan to an
// account, is the upgrade path.
export const MembersUpgradeNotice = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <LockIcon className="size-4 shrink-0" />
        {t("members.locked.title")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("members.locked.body")}
      </p>
      <Button asChild>
        <Link to="/login">{t("members.locked.cta")}</Link>
      </Button>
    </div>
  )
}
