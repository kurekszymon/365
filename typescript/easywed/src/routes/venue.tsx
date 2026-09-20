import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { SITE_ORIGIN } from "@/lib/site"
import { selectIsTenantStaff, useTenantStore } from "@/stores/tenant.store"
import { TenantWordmark, tenantStyle } from "@/components/tenant/TenantBranding"
import { Button } from "@/components/ui/button"

/**
 * The anonymous, branded front door of a venue host.
 *
 * Its own route rather than a signed-out state of /crm, for two reasons: /crm
 * means "staff", and conflating the two would put an authorization decision in
 * front of a page that needs none; and a real route gets its own prerendered
 * shell, so a visitor sees the venue immediately instead of a flash of the
 * couple landing while the router works out where it is.
 *
 * No `head:` - it inherits the root route's `noindex, nofollow`, which is what
 * every tenant host should serve. There is nothing here worth indexing and one
 * canonical apex landing already covers the marketing.
 */
export const Route = createFileRoute("/venue")({
  component: VenueEntry,
})

function VenueEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const status = useTenantStore((s) => s.status)
  const slug = useTenantStore((s) => s.slug)
  const tenant = useTenantStore((s) => s.tenant)
  const isStaff = useTenantStore(selectIsTenantStaff)

  // Staff who are already signed in have no use for the front door. A render
  // effect rather than a guard, because it depends on tenantRole, which
  // settles a round trip after the route has already matched.
  useEffect(() => {
    if (isStaff) void navigate({ to: "/crm", replace: true })
  }, [isStaff, navigate])

  // On the apex this route is meaningless; the root beforeLoad only sends
  // tenant hosts here, so this is a hand-typed URL.
  if (status === "none") {
    return (
      <VenueMessage title={t("venue.apex_title")} body={t("venue.apex_body")} />
    )
  }

  if (status === "unknown" || !tenant) {
    return status === "not_found" ? (
      <VenueMessage
        title={t("venue.not_found_title")}
        body={t("venue.not_found_body", { slug })}
      />
    ) : (
      <VenueMessage title={t("venue.loading")} body="" />
    )
  }

  if (tenant.status === "suspended") {
    return (
      <VenueMessage
        title={t("venue.suspended_title", { name: tenant.name })}
        body={t("venue.suspended_body")}
      />
    )
  }

  return (
    <div
      style={tenantStyle(tenant)}
      className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 text-center"
    >
      <TenantWordmark tenant={tenant} />

      <div className="flex max-w-md flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold">
          {t("venue.entry_title", { name: tenant.name })}
        </h1>
        <p className="text-muted-foreground">
          {tenant.tagline ?? t("venue.entry_body")}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/*
          A cross-origin anchor, never router navigation: accounts live on the
          apex and sessions are per-origin, so signing up here would create a
          session the couple cannot use anywhere they will actually plan.

          Plain /signup, with no referral attached. This carried a ?venue=<slug>
          parameter that nothing consumed: signup's validateSearch returns only
          `next`, so the value was dropped at the route boundary, and there is
          no store between account creation and VenueAccessDialog for it to sit
          in. Carrying the referral across is a real feature and this is where
          it would start - but it has to arrive with the half that reads it,
          rather than as a parameter that only looks like it works.
        */}
        <Button asChild>
          <a href={`${SITE_ORIGIN}/signup`}>{t("venue.cta_couple")}</a>
        </Button>
        <a
          href="/crm"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t("venue.cta_staff")}
        </a>
      </div>
    </div>
  )
}

function VenueMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      {body ? <p className="max-w-md text-muted-foreground">{body}</p> : null}
      <a
        href={SITE_ORIGIN}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        easywed.
      </a>
    </div>
  )
}
