import type { ReactNode } from "react"
import type { PublicTenant } from "@/stores/tenant.store"
import { TenantWordmark, tenantStyle } from "@/components/tenant/TenantBranding"

/**
 * The frame every state of the invitation page renders in: the venue's mark
 * when we know which venue it is, a heading, a sentence, and whatever the state
 * offers next.
 *
 * Branded from the preview rather than from TenantGate, because a customer
 * invite is opened on the apex, where TenantGate resolves no tenant - and it is
 * precisely the venue's name the couple needs to see before deciding anything.
 */
export const VenueInviteCard = ({
  tenant = null,
  title,
  body,
  children,
}: {
  tenant?: PublicTenant | null
  title: string
  body?: ReactNode
  children?: ReactNode
}) => (
  <div
    style={tenantStyle(tenant)}
    className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center"
  >
    {tenant ? <TenantWordmark tenant={tenant} /> : null}
    <h1 className="font-heading text-2xl font-semibold">{title}</h1>
    {body ? <p className="max-w-md text-muted-foreground">{body}</p> : null}
    {children ? (
      <div className="flex w-full max-w-md flex-col items-stretch gap-3">
        {children}
      </div>
    ) : null}
  </div>
)
