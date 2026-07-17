import { createFileRoute } from "@tanstack/react-router"
import { VenueLanding } from "@/components/landing/venues/VenueLanding"
import { localeHead } from "@/lib/seo/localeHead"

// `en_.` (trailing underscore) keeps this out of the /en route's tree — the
// locale landing has no <Outlet />, so /en/venues must not nest under it.
export const Route = createFileRoute("/en_/venues")({
  head: () =>
    localeHead("en", {
      path: "venues",
      titleKey: "venues.seo_title",
      descriptionKey: "venues.seo_description",
    }),
  component: () => <VenueLanding lang="en" />,
})
