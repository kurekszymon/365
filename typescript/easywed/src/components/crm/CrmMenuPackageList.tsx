import { useTranslation } from "react-i18next"

import type { CrmMenuPackage } from "./useTenantMenus"
import { isLive } from "@/lib/menu"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * The venue's packages, as the picker for the editor beside it.
 *
 * Archived packages stay listed, dimmed. Hiding them would make "where did last
 * year's offer go" a support question, and the reason they exist at all is that
 * a couple who ordered from one still has to be able to see what they ordered.
 */
export const CrmMenuPackageList = ({
  packages,
  currency,
  selectedId,
  onSelect,
}: {
  packages: Array<CrmMenuPackage>
  currency: string
  selectedId: string | null
  onSelect: (id: string) => void
}) => {
  const { t, i18n } = useTranslation()

  if (packages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("crm.menus.empty")}</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {packages.map((pkg) => (
        <li key={pkg.id}>
          <button
            type="button"
            onClick={() => onSelect(pkg.id)}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 rounded-md border p-3 text-left text-sm hover:bg-accent/50",
              pkg.id === selectedId && "border-primary bg-accent/40",
              !isLive(pkg) && "opacity-60"
            )}
          >
            <span className="font-medium">{pkg.name}</span>
            <span className="text-muted-foreground">
              {/* Per person, always, and never a total: extras and the age-tier
                  multipliers arrive with bookings, so anything summed here
                  would be a quote that is wrong. */}
              {t("crm.menus.per_person", {
                price: formatMoney(
                  pkg.price_per_person_minor,
                  currency,
                  i18n.language
                ),
              })}
            </span>
            {!isLive(pkg) ? (
              <span className="text-xs text-muted-foreground">
                {t("crm.menus.archived")}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
