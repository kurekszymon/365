import { createFileRoute } from "@tanstack/react-router"
import { LocaleLanding } from "@/components/landing/LocaleLanding"
import { landingJsonLd } from "@/lib/seo/landingJsonLd"
import { localeHead } from "@/lib/seo/localeHead"

export const Route = createFileRoute("/pl")({
  head: () => ({
    ...localeHead("pl", {
      titleKey: "landing.seo_title",
      descriptionKey: "seo.description",
    }),
    scripts: [landingJsonLd("pl")],
  }),
  component: () => <LocaleLanding lang="pl" />,
})
