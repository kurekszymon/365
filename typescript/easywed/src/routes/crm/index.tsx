import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useTenantStore } from "@/stores/tenant.store"

/**
 * The CRM overview.
 *
 * Deliberately thin for now: the customer roster, hall templates, the menu and
 * the kitchen report each arrive with the migration that gives them a table,
 * and each will add its own nav entry in crm.tsx. What this route establishes
 * is that /crm resolves to something inside the branded shell rather than to a
 * bare <Outlet/> - the layout is doing the interesting work.
 */
export const Route = createFileRoute("/crm/")({
  component: CrmOverview,
})

function CrmOverview() {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-semibold">
        {t("crm.overview_title", { name: tenant?.name ?? "" })}
      </h1>
      <p className="max-w-prose text-muted-foreground">
        {t("crm.overview_body")}
      </p>
    </div>
  )
}
