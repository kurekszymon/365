import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

export const Route = createFileRoute("/wedding/$id/")({
  // The hub is unused for now: every visit goes straight to the planner.
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/wedding/$id/planner",
      params: { id: params.id },
      replace: true,
    })
  },
  component: WeddingHub,
})

function WeddingHub() {
  const { id } = Route.useParams()
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          {t("wedding.hub.title")}
        </h1>

        <div className="flex flex-col gap-3">
          <Link
            to="/wedding/$id/planner"
            params={{ id }}
            className="rounded-md border bg-card p-4 hover:bg-accent"
          >
            <p className="font-medium">{t("wedding.hub.planner")}</p>
            <p className="text-sm text-muted-foreground">
              {t("wedding.hub.planner_desc")}
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
