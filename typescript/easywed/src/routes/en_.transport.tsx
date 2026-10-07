import { createFileRoute } from "@tanstack/react-router"
import { TransportLanding } from "@/components/landing/transport/TransportLanding"
import { localeHead } from "@/lib/seo/localeHead"

// `en_.` (trailing underscore) keeps this out of the /en route's tree - the
// locale landing has no <Outlet />, so /en/transport must not nest under it.
export const Route = createFileRoute("/en_/transport")({
  head: () =>
    localeHead("en", {
      path: "transport",
      titleKey: "transport.seo_title",
      descriptionKey: "transport.seo_description",
    }),
  component: () => <TransportLanding lang="en" />,
})
