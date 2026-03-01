import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const NewNotePage = lazy(() => import("../components/NewNotePage"));

export const Route = createFileRoute("/new")({
  component: () => (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <NewNotePage />
    </Suspense>
  ),
});
