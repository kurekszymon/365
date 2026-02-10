import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const AboutPage = lazy(() => import("../components/AboutPage"));

export const Route = createFileRoute("/about")({
  component: () => (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <AboutPage />
    </Suspense>
  ),
});
