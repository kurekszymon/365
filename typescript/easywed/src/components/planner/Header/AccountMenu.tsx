import {
  CookieIcon,
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
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"
import { useConsentStore } from "@/stores/consent.store"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { useUnseenRelease } from "@/components/changelog/useUnseenRelease"
import { Button } from "@/components/ui/button"
import { NotificationDot } from "@/components/ui/notification-dot"
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
  const openCookieSettings = useConsentStore((state) => state.openSettings)

  const { unseen: hasNewRelease, markSeen: markReleaseSeen } =
    useUnseenRelease()

  const label = t("account.menu")

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            {/* `relative` anchors the corner dot. It pulses here, where it is
                the only hint that something waits inside the menu. */}
            <Button variant="outline" aria-label={label} className="relative">
              {isMobile ? <MenuIcon /> : <UserRoundIcon />}
              <NotificationDot
                show={hasNewRelease}
                pulse
                label={t("account.changelog_unseen")}
              />
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

        {/* Above the account actions because these work the same signed in or
            out. New tab, like the legal links in Settings: reading the
            release notes must never cost someone their planner state. The page
            is language-pinned, so the link picks the locale the app is in. */}
        <ThemeSubmenu />
        <DropdownMenuItem asChild>
          <Link
            to={
              i18n.language.startsWith("pl") ? "/pl/changelog" : "/en/changelog"
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={markReleaseSeen}
          >
            <SparklesIcon />
            {t("account.changelog")}
            {hasNewRelease && (
              <span className="ml-auto flex items-center gap-1.5 pl-3 text-xs font-medium text-destructive">
                {t("account.changelog_new")}
                <NotificationDot placement="inline" size="sm" />
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        {/* The planner's only route to withdrawing consent for a guest, who
            has no /settings - and withdrawing has to be as easy as agreeing. */}
        <DropdownMenuItem onSelect={openCookieSettings}>
          <CookieIcon />
          {t("consent.settings")}
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
