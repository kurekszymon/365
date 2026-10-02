import {
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "@tanstack/react-router"
import { ThemeSubmenu } from "./ThemeSubmenu"
import { localeDocPath } from "@/lib/site"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Account actions, collapsed into one menu rather than two more icons in an
 * already-busy header. Hamburger on mobile where that's the expected handle
 * for "everything else"; a person glyph on desktop, where the menu is
 * specifically about who you are rather than a general overflow.
 */
export const AccountMenu = () => {
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()

  const session = useAuthStore((state) => state.session)
  const displayName = useProfileStore((state) => state.displayName)

  const label = t("account.menu")

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label={label}>
              {isMobile ? <MenuIcon /> : <UserRoundIcon />}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {/* Their own name, if they've set one - the menu is the one place it's
            worth confirming which account you're acting as. Never the email. */}
        <DropdownMenuLabel>{displayName ?? label}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Above the account actions because these two work the same signed in
            or out. New tab, like the legal links in Settings: reading the
            release notes must never cost someone their planner state. The page
            is language-pinned, so the link picks the locale the app is in. */}
        <ThemeSubmenu />
        <DropdownMenuItem asChild>
          <Link
            to={localeDocPath("changelog", i18n.language)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SparklesIcon />
            {t("account.changelog")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {session ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <SettingsIcon />
                {t("settings.title")}
              </Link>
            </DropdownMenuItem>
            {/* The route guards handle the redirect once the session clears -
                see AuthGate's router.invalidate() on SIGNED_OUT. */}
            <DropdownMenuItem onSelect={() => void supabase.auth.signOut()}>
              <LogOutIcon />
              {t("auth.sign_out")}
            </DropdownMenuItem>
          </>
        ) : (
          // Guest mode: there's no account to configure or sign out of yet.
          <DropdownMenuItem asChild>
            <Link to="/login">
              <LogInIcon />
              {t("auth.sign_in")}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
