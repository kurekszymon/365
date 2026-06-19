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
import { ErrorFallback } from "@/components/ErrorFallback"
import { useThemeStore } from "@/stores/theme.store"

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
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
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
        },
        {
          title,
        },
        {
          name: "description",
          content: description,
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
          content: "https://easywed.app",
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
          content: "https://easywed.app/og-image.png",
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
          content: "https://easywed.app/og-image.png",
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
            <AuthGate>{children}</AuthGate>
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
