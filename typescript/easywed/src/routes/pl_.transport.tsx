import { createFileRoute } from "@tanstack/react-router"
import { TransportLanding } from "@/components/landing/transport/TransportLanding"
import { localeHead } from "@/lib/seo/localeHead"

// `pl_.` (trailing underscore) keeps this out of the /pl route's tree - the
// locale landing has no <Outlet />, so /pl/transport must not nest under it.
export const Route = createFileRoute("/pl_/transport")({
  head: () =>
    localeHead("pl", {
      path: "transport",
      titleKey: "transport.seo_title",
      descriptionKey: "transport.seo_description",
    }),
  component: () => <TransportLanding lang="pl" />,
})
