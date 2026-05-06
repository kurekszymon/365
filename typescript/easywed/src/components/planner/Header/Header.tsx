import { ArrowLeftIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { WeddingName } from "./WeddingName.header"
import type { PropsWithChildren } from "react"
import { useGlobalStore } from "@/stores/global.store"

export const Header = (props: PropsWithChildren) => {
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2 print:hidden">
      {props.children}
    </div>
  )
}

const Nav = (props: PropsWithChildren) => {
  return <div className="flex min-w-0 items-center gap-3">{props.children}</div>
}

const Title = (props: PropsWithChildren<{ weddingId?: string }>) => {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BackButton weddingId={props.weddingId} />
      {props.children}
    </div>
  )
}

// Routes back to the wedding hub when planning a wedding, or to the venue
// dashboard when editing a venue hall template. Hidden for any other state.
const BackButton = (props: { weddingId?: string }) => {
  const { weddingId } = props
  const { t } = useTranslation()
  const subjectKind = useGlobalStore((s) => s.subjectKind)

  if (subjectKind === "venue_hall") {
    return (
      <Link
        to="/venue"
        title={t("planner.back")}
        aria-label={t("planner.back")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Link>
    )
  }

  if (!weddingId) return null

  return (
    <Link
      to="/wedding/$id"
      params={{ id: weddingId }}
      title={t("planner.back")}
      aria-label={t("planner.back")}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="h-4 w-4" />
    </Link>
  )
}

Header.Nav = Nav
Header.Title = Title
Header.WeddingName = WeddingName
