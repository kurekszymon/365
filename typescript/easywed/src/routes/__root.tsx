import "@/i18n"

import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { useTranslation } from "react-i18next"
import { PostHogProvider } from "@posthog/react"
import appCss from "../styles.css?url"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthGate } from "@/components/auth/AuthGate"

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
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "EasyWed - wedding planner app",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
