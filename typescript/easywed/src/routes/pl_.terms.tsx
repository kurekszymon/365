import { createFileRoute } from "@tanstack/react-router"
import { TermsOfService } from "@/components/legal/TermsOfService"
import { localeHead } from "@/lib/seo/localeHead"

// `pl_.` (trailing underscore) keeps this out of the /pl route's tree - the
// locale landing has no <Outlet />, so /pl/terms must not nest under it.
export const Route = createFileRoute("/pl_/terms")({
  head: () =>
    localeHead("pl", {
      path: "terms",
      titleKey: "terms.seo_title",
      descriptionKey: "terms.seo_description",
    }),
  component: () => <TermsOfService lang="pl" />,
})
