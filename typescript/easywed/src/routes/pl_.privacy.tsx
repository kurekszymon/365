import { createFileRoute } from "@tanstack/react-router"
import { PrivacyPolicy } from "@/components/legal/PrivacyPolicy"
import { localeHead } from "@/lib/seo/localeHead"

// `pl_.` (trailing underscore) keeps this out of the /pl route's tree — the
// locale landing has no <Outlet />, so /pl/privacy must not nest under it.
export const Route = createFileRoute("/pl_/privacy")({
  head: () =>
    localeHead("pl", {
      path: "privacy",
      titleKey: "privacy.seo_title",
      descriptionKey: "privacy.seo_description",
    }),
  component: () => <PrivacyPolicy lang="pl" />,
})
