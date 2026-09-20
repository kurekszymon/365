import { useTranslation } from "react-i18next"

import type { MenuPackage } from "@/lib/menu"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * The venue's packages, as the couple chooses between them.
 *
 * Only live packages reach this list - the caller filters with `isLive` - so a
 * retired offer is never newly orderable. One a couple already ordered keeps
 * being named everywhere else, which is exactly why the venue archives rather
 * than deletes.
 *
 * The price is per person and there is no total anywhere on this surface. The
 * extras a real quote carries (fontanna czekolady, opłata korkowa) and the
 * age-tier rates for children do not exist in the data yet, so a total would be
 * a number the couple could hold the venue to and that neither side agreed.
 */
export const MenuPackagePicker = ({
  packages,
  currency,
  selectedId,
  canEdit,
  onSelect,
}: {
  packages: Array<MenuPackage>
  currency: string
  selectedId: string | null
  canEdit: boolean
  onSelect: (id: string) => void
}) => {
  const { t, i18n } = useTranslation()

  if (packages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("menu.no_packages")}</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {packages.map((pkg) => {
        const selected = pkg.id === selectedId

        return (
          <li key={pkg.id}>
            <button
              type="button"
              disabled={!canEdit}
              aria-pressed={selected}
              onClick={() => onSelect(pkg.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1 rounded-md border p-3 text-left",
                selected && "border-primary bg-accent/40",
                canEdit
                  ? "cursor-pointer hover:bg-accent/50"
                  : "cursor-default opacity-90"
              )}
            >
              <span className="text-sm font-medium">{pkg.name}</span>
              <span className="text-sm text-muted-foreground">
                {t("menu.per_person", {
                  price: formatMoney(
                    pkg.price_per_person_minor,
                    currency,
                    i18n.language
                  ),
                })}
              </span>
              {pkg.description ? (
                <span className="text-xs text-muted-foreground">
                  {pkg.description}
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
