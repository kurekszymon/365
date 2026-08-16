import { Link, Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { requireTenantMember } from "@/lib/auth/guards"
import { SITE_ORIGIN } from "@/lib/site"
import { selectIsTenantStaff, useTenantStore } from "@/stores/tenant.store"
import { TenantWordmark, tenantStyle } from "@/components/tenant/TenantBranding"

/**
 * The staff CRM shell.
 *
 * The guard and this component split the work deliberately, and the split is
 * the point: `requireTenantMember` owns only the two "wrong place entirely"
 * cases (the apex, and no session), because a guard cannot render. Everything
 * that needs to be *shown inside the venue's shell* - an unknown slug, a
 * non-member, a role still resolving - is decided here.
 *
 * No `head:`, so every /crm route inherits the root's `noindex, nofollow`.
 * robots.txt only disallows /crm/wedding/, and that asymmetry is intentional:
 * Disallow and noindex do not stack, so blocking a URL means the noindex is
 * never read and Google keeps the bare URL from inbound links. That is exactly
 * how /home got indexed. Crawlable-and-noindex is what actually removes a page.
 */
export const Route = createFileRoute("/crm")({
  beforeLoad: ({ location }) => {
    requireTenantMember(location.pathname)
  },
  component: CrmLayout,
})

const NAV = [{ to: "/crm", label: "crm.nav.overview", exact: true }] as const

function CrmLayout() {
  const { t } = useTranslation()
  const status = useTenantStore((s) => s.status)
  const slug = useTenantStore((s) => s.slug)
  const tenant = useTenantStore((s) => s.tenant)
  const tenantRole = useTenantStore((s) => s.tenantRole)
  const isStaff = useTenantStore(selectIsTenantStaff)

  if (status === "not_found") {
    return (
      <CrmMessage
        title={t("crm.not_found_title")}
        body={t("crm.not_found_body", { slug })}
      />
    )
  }

  // Still resolving. Distinct from `null` below, which is a verdict - showing
  // a 403 here would flash it at every staff member on every cold load.
  if (status === "unknown" || !tenant || tenantRole === undefined) {
    return <CrmMessage title={t("crm.loading")} body="" />
  }

  if (tenant.status === "suspended") {
    return (
      <CrmMessage
        title={t("crm.suspended_title", { name: tenant.name })}
        body={t("crm.suspended_body")}
      />
    )
  }

  // Signed in, resolved, and not staff. A customer lands here too - being
  // married at a venue is not working for it.
  if (!isStaff) {
    return (
      <CrmMessage
        title={t("crm.forbidden_title")}
        body={t("crm.forbidden_body", { name: tenant.name })}
        // The one useful onward move for a couple who followed a stale link.
        action={{ href: `${SITE_ORIGIN}/home`, label: t("crm.forbidden_cta") }}
      />
    )
  }

  return (
    <div style={tenantStyle(tenant)} className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <TenantWordmark
            tenant={tenant}
            className="font-heading font-semibold"
          />
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="text-muted-foreground hover:text-foreground [&.active]:text-foreground"
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>
        </div>
        <span className="text-sm text-muted-foreground">
          {t(`crm.role.${tenantRole}`)}
        </span>
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}

function CrmMessage({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      {body ? <p className="max-w-md text-muted-foreground">{body}</p> : null}
      {action ? (
        <a
          href={action.href}
          className="text-sm underline underline-offset-4 hover:text-foreground"
        >
          {action.label}
        </a>
      ) : null}
    </div>
  )
}
