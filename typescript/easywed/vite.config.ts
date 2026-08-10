import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const SITE = "https://easywed.app"

// The marketing surface, in both locales. Everything here is prerendered to
// real HTML at build time; every other route stays a client-rendered SPA served
// from the shell. Without this the whole site was one empty index.html, which
// is why Google had no text to rank the homepage on.
const LOCALES = ["pl", "en"] as const

// Subpath under the locale segment ("" is the landing itself) → sitemap weight.
const MARKETING = [
  { sub: "", priority: 1.0 },
  { sub: "/venues", priority: 0.8 },
  { sub: "/privacy", priority: 0.3 },
  { sub: "/terms", priority: 0.3 },
]

const alternateRefs = (sub: string) => [
  { href: `${SITE}/pl${sub}`, hreflang: "pl" },
  { href: `${SITE}/en${sub}`, hreflang: "en" },
  { href: sub ? `${SITE}/pl${sub}` : `${SITE}/`, hreflang: "x-default" },
]

const pages = [
  // "/" serves the Polish landing verbatim, so it is a true duplicate of /pl.
  // It is still prerendered - Google has been indexing it for months and needs
  // real content plus a canonical to follow - but it is kept out of the sitemap
  // and points at /pl, so the locale pair stays the one canonical structure.
  {
    path: "/",
    prerender: { enabled: true, crawlLinks: false },
    sitemap: { exclude: true },
  },
  ...MARKETING.flatMap(({ sub, priority }) =>
    LOCALES.map((lang) => ({
      path: `/${lang}${sub}`,
      prerender: { enabled: true, crawlLinks: false },
      sitemap: {
        priority,
        changefreq: "monthly" as const,
        alternateRefs: alternateRefs(sub),
      },
    })),
  ),
]

const config = defineConfig({
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      // The shell must not live at "/", in either maskPath or outputPath: the
      // plugin appends it to `pages` as an entry keyed on maskPath, so at the
      // default it collided with the homepage entry below and won - "/" came out
      // 4kB of scripts while /pl came out 28kB of content. maskPath has to
      // resolve to a real 200 route, hence src/routes/app-shell.tsx. Unmatched
      // routes reach the shell through the rewrite in public/_redirects.
      spa: {
        enabled: true,
        maskPath: "/app-shell",
        prerender: { outputPath: "/app-shell", crawlLinks: false },
      },
      pages,
      // Both discovery mechanisms off, so `pages` above is the whole list.
      // autoStaticPathsDiscovery (on by default) enrolls every static route in
      // the tree, and crawlLinks follows the landing's nav; between them /home,
      // /login, /settings and /auth/callback were prerendered AND - because the
      // sitemap is built from the same page list - published as indexable URLs
      // while their own HTML said noindex. Unmatched routes fall back to the
      // shell, which is what those pages should serve anyway.
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
      },
      sitemap: { enabled: true, host: SITE, outputPath: "sitemap.xml" },
    }),
    viteReact(),
  ],
})

export default config
