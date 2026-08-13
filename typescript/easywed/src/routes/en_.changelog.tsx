import { createFileRoute } from "@tanstack/react-router"
import { Changelog } from "@/components/changelog/Changelog"
import { localeHead } from "@/lib/seo/localeHead"

// `en_.` (trailing underscore) keeps this out of the /en route's tree - the
// locale landing has no <Outlet />, so /en/changelog must not nest under it.
export const Route = createFileRoute("/en_/changelog")({
  head: () =>
    localeHead("en", {
      path: "changelog",
      // `changelog:` is the i18n namespace the release notes live in.
      titleKey: "changelog:seo_title",
      descriptionKey: "changelog:seo_description",
    }),
  component: () => <Changelog lang="en" />,
})
