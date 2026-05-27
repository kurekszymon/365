import { createBrowserRouter } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { HomePage } from "@/pages/HomePage"
import { LevelPage } from "@/pages/LevelPage"
import { LevelSummaryPage } from "@/pages/LevelSummaryPage"
import { ReviewPage } from "@/pages/ReviewPage"
import { SettingsPage } from "@/pages/SettingsPage"

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/level/:id", element: <LevelPage /> },
      { path: "/level/:id/summary", element: <LevelSummaryPage /> },
      { path: "/review", element: <ReviewPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
])
