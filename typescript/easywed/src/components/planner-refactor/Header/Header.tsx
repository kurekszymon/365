import { GuestsSeated } from "./GuestsSeated.header"
import { Nav } from "./Nav.header"
import { WeddingName } from "./WeddingName.header"

// header should probably be similar / same between pages, need to rethink that.
// TODO: handle mobile header view, something like hamburger with separator
export const Header = () => {
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2 print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <WeddingName />
        <GuestsSeated />
        <Nav />
      </div>

      {/* Right: actions */}
      <div></div>
    </div>
  )
}
