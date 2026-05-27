import { Outlet, NavLink, useLocation } from "react-router-dom"
import { Home, RotateCcw, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/review", icon: RotateCcw, labelKey: "nav.review" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
] as const

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const isLevelPage = location.pathname.startsWith("/level/")

  return (
    <div className="flex flex-col h-dvh bg-slate-950 text-slate-100">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4 h-full">
          <Outlet />
        </div>
      </main>

      {!isLevelPage && (
        <nav className="shrink-0 border-t border-slate-800 bg-slate-950/90 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-lg mx-auto flex">
            {navItems.map(({ to, icon: Icon, labelKey }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                    isActive ? "text-indigo-400" : "text-slate-500 hover:text-slate-300",
                  )
                }
              >
                <Icon size={20} />
                <span>{t(labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
