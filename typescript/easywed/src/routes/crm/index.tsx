import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { CrmWeddingList } from "@/components/crm/CrmWeddingList"
import { identifyTenantGroup } from "@/lib/analytics/track"
import { useTenantStore } from "@/stores/tenant.store"

/**
 * The CRM overview.
 *
 * Still thin: hall templates arrive with the migration that gives them a table,
 * and will add their own nav entry in crm.tsx the way /crm/menus did. What is
 * here now is the one list the venue role makes possible - the weddings whose
 * couples granted access - and it is what makes /crm/wedding/$id reachable
 * without anyone pasting an id.
 */
export const Route = createFileRoute("/crm/")({
  component: CrmOverview,
})

function CrmOverview() {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)

  // Attributed as a PostHog *group*, never an event property - see
  // identifyTenantGroup. Set here rather than in TenantGate because the group
  // is about staff activity in the CRM, and the anonymous entry page at /venue
  // resolves a tenant too.
  useEffect(() => {
    if (tenant) identifyTenantGroup(tenant.id, tenant.name)
  }, [tenant])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">
          {t("crm.overview_title", { name: tenant?.name ?? "" })}
        </h1>
        <p className="max-w-prose text-muted-foreground">
          {t("crm.overview_body")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-semibold">
          {t("crm.weddings.title")}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("crm.weddings.body")}
        </p>
        {tenant ? <CrmWeddingList tenantId={tenant.id} /> : null}
      </div>
    </div>
  )
}
