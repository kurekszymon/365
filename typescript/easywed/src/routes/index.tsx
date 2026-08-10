import { createFileRoute, redirect } from "@tanstack/react-router"
import { LocaleLanding } from "@/components/landing/LocaleLanding"
import i18n from "@/i18n"
import { rootHead } from "@/lib/seo/localeHead"

// The root path is a language dispatcher: it sends visitors to the
// language-pinned marketing landing (/pl or /en) based on the detected UI
// language. The actual app dashboard lives at /home.
export const Route = createFileRoute("/")({
  head: rootHead,
  beforeLoad: () => {
    // Language detection reads the browser (navigator / localStorage), which
    // isn't available during SSR/prerender - skip on the server so the shell
    // prerenders cleanly and the redirect fires on hydration instead.
    if (typeof window === "undefined") return

    const detected =
      i18n.resolvedLanguage || i18n.language || navigator.language || ""
    throw redirect({
      to: detected.toLowerCase().startsWith("pl") ? "/pl" : "/en",
      replace: true,
    })
  },
  // Renders the Polish landing rather than null: "/" is the URL Search Console
  // actually reports impressions against, and a crawler stops at the prerender
  // (the redirect above is hydration-only), so returning null served Google an
  // empty page for the site's highest-traffic URL. Browsers redirect past this
  // on hydration, so it is only ever painted for the instant before that.
  component: () => <LocaleLanding lang="pl" />,
})
