import type { CSSProperties } from "react"
import type { PublicTenant } from "@/stores/tenant.store"

/**
 * Turns a tenant's branding into CSS custom properties.
 *
 * This is the one place tenant-authored values reach `element.style`, which is
 * why it is a function with a comment rather than three inline template
 * strings. The safety argument is *entirely* the database CHECK constraints in
 * 20260817000001: `primary_color` and `accent_color` match `^#[0-9a-f]{6}$`,
 * `logo_url` matches `^https://[a-z0-9.-]+/[A-Za-z0-9._~:/?&=+%@-]*$`. Nothing
 * else can be stored, so nothing else can be emitted. All three are anchored at
 * both ends, which is the whole guarantee - an unanchored `~` in that migration
 * would leave the tail of a value free, and this function would emit it.
 *
 * That is also the reason branding is columns rather than one jsonb blob: a
 * CHECK cannot reach inside jsonb, so a blob would move the guard here, into
 * client code, where one forgotten call site is a CSS injection.
 *
 * If a branding field is ever added, add its CHECK in the same migration. A
 * nullable text column with no constraint is the failure mode this shape
 * exists to prevent.
 */
export const tenantStyle = (tenant: PublicTenant | null): CSSProperties => {
  if (!tenant) return {}

  const vars: Record<string, string> = {}
  if (tenant.primaryColor) vars["--tenant-primary"] = tenant.primaryColor
  if (tenant.accentColor) vars["--tenant-accent"] = tenant.accentColor

  return vars
}

/**
 * The venue's name, as a logo when it has one and as type when it does not.
 *
 * `logo_url` is constrained to an https URL by the same CHECK, so this cannot
 * become a `javascript:` href or a data URI. The name is used as the alt text
 * rather than a generic "logo", because a venue's name is the useful thing to
 * announce.
 */
export function TenantWordmark({
  tenant,
  className,
}: {
  tenant: PublicTenant
  className?: string
}) {
  if (tenant.logoUrl) {
    return (
      <img
        src={tenant.logoUrl}
        alt={tenant.name}
        className={className ?? "h-10 w-auto object-contain"}
      />
    )
  }

  return (
    <span
      className={className ?? "font-heading text-xl font-semibold"}
      style={{ color: "var(--tenant-primary, inherit)" }}
    >
      {tenant.name}
    </span>
  )
}
