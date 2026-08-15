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
  { sub: "/changelog", priority: 0.5 },
  { sub: "/privacy", priority: 0.3 },
  { sub: "/terms", priority: 0.3 },
]

// Polish is x-default throughout, matching the <link> tags in
// src/lib/seo/localeHead.ts. "/" is never the x-default target: it canonicals
// into /pl and is excluded from the sitemap, and an hreflang cluster must point
// at canonical URLs or Google drops the annotations.
const alternateRefs = (sub: string) => [
  { href: `${SITE}/pl${sub}`, hreflang: "pl" },
  { href: `${SITE}/en${sub}`, hreflang: "en" },
  { href: `${SITE}/pl${sub}`, hreflang: "x-default" },
]

// App surfaces. Prerendered so the URL returns real HTML - a crawler can only
// read the noindex meta tag off a page it can actually fetch - but excluded from
// the sitemap, which is a list of pages you want indexed and so the exact
// opposite of these. They must be listed by hand: without them the route falls
// through to Cloudflare's SPA fallback, which serves index.html, and index.html
// is now the landing - so /home would answer with indexable marketing copy.
const APP_ROUTES = [
  "/home",
  "/login",
  "/signup",
  "/settings",
  "/accept-terms",
  "/forgot-password",
  "/reset-password",
  "/wedding/local",
  "/wedding/local/planner",
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
    }))
  ),
  ...APP_ROUTES.map((path) => ({
    path,
    prerender: { enabled: true, crawlLinks: false },
    sitemap: { exclude: true },
  })),
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
      // resolve to a real 200 route, hence src/routes/app-shell.tsx.
      //
      // The shell is emitted as 404.html because that is the only hook
      // Cloudflare Pages gives a static deploy for "serve this when no asset
      // matches". Left to itself Pages falls back to index.html, and index.html
      // is a prerendered page - it dehydrates with the index route already
      // matched (lastMatchId is the "/" route), so hydrating it at
      // /wedding/$id hands the router state for a route the URL is not on.
      // The shell dehydrates with __root__ alone, which is what makes it safe
      // to hydrate anywhere.
      //
      // A `_redirects` wildcard is the other way to route unmatched paths here,
      // and it does not work: Pages evaluates _redirects BEFORE static assets
      // and ignores the `200` rewrite, 308ing to the extensionless path, which
      // re-matches the wildcard. That put every URL on the site - robots.txt and
      // sitemap.xml included - into a redirect loop.
      //
      // Cost of 404.html: dynamic deep links answer 404 while rendering fine.
      // Harmless for /wedding/$id and /invite/$token, which are private links
      // that should not be indexed anyway.
      spa: {
        enabled: true,
        maskPath: "/app-shell",
        prerender: { outputPath: "/404", crawlLinks: false },
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
