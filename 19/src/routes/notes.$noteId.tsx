import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const NoteDetailPage = lazy(() => import("../components/NoteDetailPage"));

function NoteDetailRoute() {
  const { noteId } = Route.useParams();
  return (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <NoteDetailPage noteId={noteId} />
    </Suspense>
  );
}

export const Route = createFileRoute("/notes/$noteId")({
  component: NoteDetailRoute,
});
