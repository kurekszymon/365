import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ExternalLinkIcon, FileTextIcon, ShieldCheckIcon } from "lucide-react"

/**
 * The Regulamin and Polityka prywatności, reachable from inside the app.
 *
 * Art. 8 ust. 1 pkt 1 UŚUDE wants them continuously available and retrievable,
 * which the marketing footers alone don't cover - nobody planning a wedding
 * goes back to the landing page to re-read a contract. Settings rather than
 * AccountMenu because that menu only renders inside the planner and the venue
 * CRM, so a user on the wedding list would have no route to them.
 *
 * New tab, so reading the terms never costs someone their planner state.
 */
export const LegalLinksSection = () => {
  const { t, i18n } = useTranslation()
  const isPolish = i18n.language.startsWith("pl")

  const documents = [
    {
      key: "terms",
      to: isPolish ? "/pl/terms" : "/en/terms",
      icon: FileTextIcon,
      label: t("settings.legal.terms"),
    },
    {
      key: "privacy",
      to: isPolish ? "/pl/privacy" : "/en/privacy",
      icon: ShieldCheckIcon,
      label: t("settings.legal.privacy"),
    },
  ] as const

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{t("settings.legal.title")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("settings.legal.summary")}
        </p>
      </div>

      <div className="flex flex-col">
        {documents.map(({ key, to, icon: Icon, label }) => (
          <Link
            key={key}
            to={to}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            <ExternalLinkIcon
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
