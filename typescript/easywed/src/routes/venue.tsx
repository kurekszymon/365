import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/venue")({
  component: () => <Outlet />,
})
