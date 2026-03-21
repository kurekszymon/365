import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">EasyWed</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          Your wedding, all in one place.
        </p>
        <Link
          to="/planner"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Open Table Planner
        </Link>
      </div>
    </div>
  )
}
