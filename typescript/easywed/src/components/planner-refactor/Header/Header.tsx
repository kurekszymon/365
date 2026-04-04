import { WeddingName } from "./WeddingName.header"
import type { PropsWithChildren } from "react"

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

const Title = (props: PropsWithChildren) => {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <WeddingName />
      {props.children}
    </div>
  )
}

Header.Nav = Nav
Header.Title = Title
