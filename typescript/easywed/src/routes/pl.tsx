import { createFileRoute } from "@tanstack/react-router"
import { LocaleLanding } from "@/components/LocaleLanding"
import { localeHead } from "@/lib/seo/localeHead"

export const Route = createFileRoute("/pl")({
  head: () => localeHead("pl"),
  component: () => <LocaleLanding lang="pl" />,
})
