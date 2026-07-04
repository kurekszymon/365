import { createFileRoute } from "@tanstack/react-router"
import { PrivacyPolicy } from "@/components/legal/PrivacyPolicy"
import { localeHead } from "@/lib/seo/localeHead"

// `en_.` (trailing underscore) keeps this out of the /en route's tree — the
// locale landing has no <Outlet />, so /en/privacy must not nest under it.
export const Route = createFileRoute("/en_/privacy")({
  head: () =>
    localeHead("en", {
      path: "privacy",
      titleKey: "privacy.seo_title",
      descriptionKey: "privacy.seo_description",
    }),
  component: () => <PrivacyPolicy lang="en" />,
})
