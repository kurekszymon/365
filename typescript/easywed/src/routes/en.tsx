import { createFileRoute } from "@tanstack/react-router"
import { LocaleLanding } from "@/components/LocaleLanding"
import { localeHead } from "@/lib/seo/localeHead"

export const Route = createFileRoute("/en")({
  head: () => localeHead("en"),
  component: () => <LocaleLanding lang="en" />,
})
