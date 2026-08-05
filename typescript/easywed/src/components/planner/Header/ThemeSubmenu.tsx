import { PaletteIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Theme } from "@/stores/theme.store"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { THEMES, useThemeStore } from "@/stores/theme.store"

// Small preview swatches so each palette is recognizable at a glance.
const SWATCH: Record<Theme, string> = {
  blush: "bg-[oklch(0.62_0.11_14)]",
  sage: "bg-[oklch(0.58_0.08_150)]",
  editorial: "bg-[oklch(0.5_0.1_330)]",
}

/**
 * Theme picker as a submenu of `AccountMenu` rather than its own header
 * button: picking a palette is a once-a-wedding decision, so it didn't earn a
 * permanent icon in a header that was already too crowded on mobile.
 * Renders nothing on its own - mount it inside a `DropdownMenuContent`.
 */
export const ThemeSubmenu = () => {
  const { t } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <PaletteIcon />
        {t("theme.label")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-auto min-w-44">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {THEMES.map((name) => (
            <DropdownMenuRadioItem key={name} value={name} className="gap-2">
              <span
                aria-hidden
                className={`size-3 shrink-0 rounded-full ${SWATCH[name]}`}
              />
              {t(`theme.${name}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
