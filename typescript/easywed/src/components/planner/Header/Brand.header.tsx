import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { BrandMark } from "@/components/brand/BrandMark"

/**
 * Mark + wordmark at the head of the planner header, separated from the
 * wedding name by a divider. The wordmark drops on narrow screens - the mark
 * alone still identifies the app, and the wedding name is what matters there.
 */
export const Brand = () => {
  const { i18n } = useTranslation()
  // Same language-pinned landing the /home wordmark links to.
  const landingPath = i18n.resolvedLanguage === "pl" ? "/pl" : "/en"

  return (
    <Link
      to={landingPath}
      className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
    >
      <BrandMark className="h-6 w-6" />
      {/* `items-center` centres the line box, but an all-lowercase Playfair
          wordmark's ink is the x-height band, ~0.15em below the box's middle -
          the lift puts the mark's centre on it. Inline-block so it applies. */}
      <span className="hidden -translate-y-[0.15em] font-heading text-base font-semibold sm:inline-block">
        easywed.
      </span>
    </Link>
  )
}
