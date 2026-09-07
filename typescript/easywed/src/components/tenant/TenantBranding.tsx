import type { CSSProperties } from "react"
import type { PublicTenant } from "@/stores/tenant.store"

/**
 * Turns a tenant's branding into CSS custom properties - the one place
 * tenant-authored values reach `element.style`.
 *
 * The safety argument is *entirely* the CHECK constraints in 20260817000001:
 * `primary_color` and `accent_color` match `^#[0-9a-f]{6}$`, `logo_url` matches
 * `^https://[a-z0-9.-]+/[A-Za-z0-9._~:/?&=+%@-]*$`. All three are anchored at
 * both ends, which is the whole guarantee - an unanchored `~` would leave the
 * tail of a value free and this function would emit it.
 *
 * That is also why branding is columns rather than one jsonb blob: a CHECK
 * cannot reach inside jsonb, so a blob would move the guard into client code
 * where one forgotten call site is a CSS injection. **A new branding field needs
 * its CHECK in the same migration.**
 */
export const tenantStyle = (tenant: PublicTenant | null): CSSProperties => {
  if (!tenant) return {}

  // Keyed on `--${string}`, not `string`: React sets CSS custom properties at
  // runtime but csstype does not describe them, so `CSSProperties` has no index
  // signature to declare these against. A `Record<string, string>` would satisfy
  // the return type by accident - and would also accept `vars.background = ...`.
  // The pattern key says what this actually emits, with no assertion to review.
  const vars: Record<`--${string}`, string> = {}
  if (tenant.primaryColor) vars["--tenant-primary"] = tenant.primaryColor
  if (tenant.accentColor) vars["--tenant-accent"] = tenant.accentColor

  return vars
}

/**
 * The venue's name, as a logo when it has one and as type when it does not.
 * `logo_url` is constrained to an https URL by the same CHECK, so this cannot
 * become a `javascript:` href or a data URI. The name is the alt text, since
 * that is the useful thing to announce.
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
