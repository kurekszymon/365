import { createFileRoute } from "@tanstack/react-router"
import { VenueLanding } from "@/components/landing/venues/VenueLanding"
import { localeHead } from "@/lib/seo/localeHead"

// `pl_.` (trailing underscore) keeps this out of the /pl route's tree - the
// locale landing has no <Outlet />, so /pl/venues must not nest under it.
export const Route = createFileRoute("/pl_/venues")({
  head: () =>
    localeHead("pl", {
      path: "venues",
      titleKey: "venues.seo_title",
      descriptionKey: "venues.seo_description",
    }),
  component: () => <VenueLanding lang="pl" />,
})
