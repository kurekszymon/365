import { createFileRoute } from "@tanstack/react-router"

// Target for `spa.maskPath`. The plugin prerenders the SPA shell by actually
// requesting maskPath, so it has to resolve to a real 200 route - pointing it
// at a path with no route 404s and the shell is silently never written.
//
// Renders nothing on purpose: the shell request carries a header that makes the
// server emit the root layout alone, so this component's output is discarded.
// The result is written as 404.html, which Cloudflare Pages serves for every
// unmatched path - see the `spa` block in vite.config.ts.
//
// Inherits the root route's `noindex`, so the fallback HTML that dynamic routes
// like /wedding/$id serve is not indexable.
export const Route = createFileRoute("/app-shell")({
  component: () => null,
})
