import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { PostHogProvider } from "@posthog/react"
import appCss from "../styles.css?url"
import i18n from "@/i18n"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AuthGate } from "@/components/auth/AuthGate"
import { TenantGate } from "@/components/tenant/TenantGate"
import { redirectApexOnlyPathToApex } from "@/lib/tenant/apexRedirect"
import { requireAcceptedTerms } from "@/lib/auth/guards"
import { LocalWeddingMigrationPrompt } from "@/components/auth/LocalWeddingMigrationPrompt"
import { ErrorFallback } from "@/components/ErrorFallback"
import { useThemeStore } from "@/stores/theme.store"
import { useAiStore } from "@/stores/ai.store"
import { scrubInviteTokens } from "@/lib/analytics/scrubInviteTokens"
import { OG_IMAGE, SITE_ORIGIN } from "@/lib/site"

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  // Load-bearing beyond the cookie banner it saves us: session replay cannot
  // start in cookieless mode, and scrubInviteTokens deliberately does not walk
  // into $snapshot payloads. Turning this off silently enables replay of the
  // planner - the guest list, names and all - with un-redacted invite tokens
  // in the recorded URLs. Read the note at the bottom of scrubInviteTokens.ts
  // before changing it.
  cookieless_mode: "always",
  // Off because autocapture reports the text of whatever was clicked, and in
  // the planner that is a wedding guest's name - a third party with no
  // relationship to us, and beyond what privacy.data.usage promises.
  // Product events are declared explicitly instead; see lib/analytics/track.
  autocapture: false,
  // Invite tokens are bearer credentials and they live in the URL path, which
  // pageview capture would otherwise ship verbatim. See scrubInviteTokens.
  before_send: scrubInviteTokens,
} as const

function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="flex h-svh flex-col items-center justify-center gap-2 text-center">
      <p className="text-2xl font-semibold">{t("errors.404")}</p>
      <p className="text-muted-foreground">{t("errors.not_found")}</p>
      <a href="/" className="text-sm text-primary underline underline-offset-4">
        {t("errors.go_home")}
      </a>
    </div>
  )
}

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  errorComponent: ErrorFallback,
  // On the root route because the acceptance has to survive someone typing a
  // path instead of following the flow - a per-route guard would only cover the
  // routes we remembered to annotate.
  beforeLoad: ({ location }) => {
    // Before the terms gate, because it leaves this origin entirely: there is
    // no point deciding whether someone owes an acceptance on a host we are
    // about to send them off.
    redirectApexOnlyPathToApex(location.pathname)
    requireAcceptedTerms(location.pathname)
  },
  head: () => {
    const language = i18n.resolvedLanguage === "pl" ? "pl" : "en"
    const isPolish = language === "pl"
    const title = i18n.t("seo.title", { lng: language })
    const description = i18n.t("seo.description", { lng: language })

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        // Deliberately no maximum-scale / user-scalable=no. Blocking pinch-zoom
        // is a WCAG 1.4.4 failure, and it was never what protected the planner:
        // the canvas claims its own two-finger gesture through
        // `touch-action: none` (the `touch-none` class on the Canvas container
        // and every draggable), which is what stops the browser applying its
        // pan/zoom there. iOS Safari has ignored these two directives since
        // iOS 10 regardless, so they only ever bound Android Chrome - where
        // they cost zoom on the guest list, forms and dialogs for nothing.
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title,
        },
        {
          name: "description",
          content: description,
        },
        // Default the whole app to noindex and let the marketing routes opt
        // back in (localeHead / rootHead emit "index, follow"). Inverted on
        // purpose: signed-in surfaces vastly outnumber indexable pages, and
        // Search Console was showing /home and /login ranking for nothing.
        // A missed opt-in costs one page; a missed opt-out leaks the app.
        {
          name: "robots",
          content: "noindex, nofollow",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:site_name",
          content: "easywed.",
        },
        {
          property: "og:url",
          content: SITE_ORIGIN,
        },
        {
          property: "og:title",
          content: title,
        },
        {
          property: "og:description",
          content: description,
        },
        {
          property: "og:locale",
          content: isPolish ? "pl_PL" : "en_US",
        },
        {
          property: "og:locale:alternate",
          content: isPolish ? "en_US" : "pl_PL",
        },
        {
          property: "og:image",
          content: OG_IMAGE,
        },
        {
          property: "og:image:type",
          content: "image/png",
        },
        {
          property: "og:image:width",
          content: "1200",
        },
        {
          property: "og:image:height",
          content: "630",
        },
        {
          property: "og:image:alt",
          content: "easywed.",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:title",
          content: title,
        },
        {
          name: "twitter:description",
          content: description,
        },
        {
          name: "twitter:image",
          content: OG_IMAGE,
        },
        {
          name: "twitter:image:alt",
          content: "easywed.",
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "icon",
          href: "/favicon.ico",
          sizes: "any",
        },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "manifest",
          href: "/manifest.json",
        },
      ],
    }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Derive <html lang> from the path so it's correct in the server-rendered
  // HTML (matching the per-locale og tags) and updates reactively on client
  // navigation. Only /en is English; everything else defaults to Polish.
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const lang = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pl"

  // React is the single source of truth for the theme attribute. The server and
  // first client render use the store's default (matching SSR); rehydrating from
  // localStorage after mount swaps to the saved theme.
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    void useThemeStore.persist.rehydrate()
    // BYO-key AI settings are also persisted with skipHydration, so read them
    // from localStorage after mount alongside the theme.
    void useAiStore.persist.rehydrate()
  }, [])

  return (
    <html lang={lang} data-theme={theme}>
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogProvider
          apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN}
          options={options}
        >
          <TooltipProvider>
            {/* Inside AuthGate, not beside it: the branding lookup is
                anonymous, but resolving the caller's tenant role needs a
                settled session. */}
            <AuthGate>
              <TenantGate>{children}</TenantGate>
            </AuthGate>
            <LocalWeddingMigrationPrompt />
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </PostHogProvider>

        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
