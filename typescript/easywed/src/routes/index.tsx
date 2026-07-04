import { createFileRoute, redirect } from "@tanstack/react-router"
import i18n from "@/i18n"

// The root path is a language dispatcher: it sends visitors to the
// language-pinned marketing landing (/pl or /en) based on the detected UI
// language. The actual app dashboard lives at /app.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Language detection reads the browser (navigator / localStorage), which
    // isn't available during SSR/prerender — skip on the server so the shell
    // prerenders cleanly and the redirect fires on hydration instead.
    if (typeof window === "undefined") return

    const detected =
      i18n.resolvedLanguage || i18n.language || navigator.language || ""
    throw redirect({
      to: detected.toLowerCase().startsWith("pl") ? "/pl" : "/en",
      replace: true,
    })
  },
  component: () => null,
})
