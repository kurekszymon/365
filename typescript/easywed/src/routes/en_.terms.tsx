import { createFileRoute } from "@tanstack/react-router"
import { TermsOfService } from "@/components/legal/TermsOfService"
import { localeHead } from "@/lib/seo/localeHead"

// `en_.` (trailing underscore) keeps this out of the /en route's tree - the
// locale landing has no <Outlet />, so /en/terms must not nest under it.
export const Route = createFileRoute("/en_/terms")({
  head: () =>
    localeHead("en", {
      path: "terms",
      titleKey: "terms.seo_title",
      descriptionKey: "terms.seo_description",
    }),
  component: () => <TermsOfService lang="en" />,
})
