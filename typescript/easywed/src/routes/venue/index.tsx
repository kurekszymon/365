import { createFileRoute, redirect } from "@tanstack/react-router"

import { APIProvider } from "@vis.gl/react-google-maps"

import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { useGlobalStore } from "@/stores/global.store"
import { VenueDashboard } from "@/components/venue/VenueDashboard"

export const Route = createFileRoute("/venue/")({
  beforeLoad: () => {
    requireAuth("/venue")
    requireOnboarded()
    // Couples have no business on the venue dashboard — its inserts would
    // hit RLS failures (venues INSERT policy gates on profile.user_type).
    // Bounce them to their own root, where index.tsx will route correctly.
    if (useGlobalStore.getState().userType === "couple") {
      throw redirect({ to: "/", replace: true })
    }
  },
  component: VenueRoot,
})

function VenueRoot() {
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    console.error("[venue] missing Google Maps API key")
    return <VenueDashboard />
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""}>
      <VenueDashboard />
    </APIProvider>
  )
}
