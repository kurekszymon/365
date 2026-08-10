import { createFileRoute } from "@tanstack/react-router"
import { LocaleLanding } from "@/components/landing/LocaleLanding"
import { localeHead } from "@/lib/seo/localeHead"

export const Route = createFileRoute("/en")({
  head: () =>
    localeHead("en", {
      titleKey: "landing.seo_title",
      descriptionKey: "seo.description",
    }),
  component: () => <LocaleLanding lang="en" />,
})
