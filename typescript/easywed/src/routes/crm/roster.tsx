import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { CrmRosterInviteForm } from "@/components/crm/CrmRosterInviteForm"
import { CrmRosterInvitations } from "@/components/crm/CrmRosterInvitations"
import { CrmRosterMembers } from "@/components/crm/CrmRosterMembers"
import { useTenantRoster } from "@/components/crm/useTenantRoster"
import { useTenantStore } from "@/stores/tenant.store"

/**
 * The venue's roster: who belongs to it, and the invitations that put them
 * there.
 *
 * This is the screen that makes an invitation-only venue usable at all.
 * `tenants.open_linking` defaults to false, and `link_wedding_to_venue`'s
 * invitation-only branch looks for a `tenant_members` row with role
 * 'customer' - which, until 20260820000001, nothing but a hand-written SQL
 * statement could produce. A couple could not link to a venue that had not
 * opened itself to the world.
 *
 * No guard of its own: /crm's layout has already decided the caller is staff of
 * a resolved, active tenant before this renders.
 */
export const Route = createFileRoute("/crm/roster")({
  component: CrmRoster,
})

function CrmRoster() {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)
  const roster = useTenantRoster(tenant?.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">
          {t("crm.roster.title")}
        </h1>
        <p className="max-w-prose text-muted-foreground">
          {t("crm.roster.body")}
        </p>
      </div>

      {roster.error ? (
        <p className="text-sm text-destructive">{roster.error}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">
          {t("crm.roster.invite_title")}
        </h2>
        <CrmRosterInviteForm
          role={roster.role}
          setRole={roster.setRole}
          canInviteStaff={roster.canInviteStaff}
          submitting={roster.submitting}
          onCreate={() => void roster.handleCreate()}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">
          {t("crm.roster.invitations_title")}
        </h2>
        {roster.loaded ? (
          <CrmRosterInvitations
            invitations={roster.pending}
            copiedId={roster.copiedId}
            fallbackUrl={roster.fallbackUrl}
            onCopy={(invitation) => void roster.handleCopy(invitation)}
            onRevoke={(id) => void roster.handleRevoke(id)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("crm.loading")}</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">
          {t("crm.roster.members_title")}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("crm.roster.members_body")}
        </p>
        {roster.loaded ? (
          <CrmRosterMembers
            members={roster.members}
            currentUserId={roster.currentUserId}
            onRemove={(member) => void roster.handleRemove(member)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("crm.loading")}</p>
        )}
      </section>
    </div>
  )
}
