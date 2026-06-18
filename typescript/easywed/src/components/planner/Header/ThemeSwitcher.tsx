import { PaletteIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Theme } from "@/stores/theme.store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { THEMES, useThemeStore } from "@/stores/theme.store"

// Small preview swatches so each palette is recognizable at a glance.
const SWATCH: Record<Theme, string> = {
  blush: "bg-[oklch(0.62_0.11_14)]",
  sage: "bg-[oklch(0.58_0.08_150)]",
  editorial: "bg-[oklch(0.5_0.1_330)]",
}

export const ThemeSwitcher = () => {
  const { t } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label={t("theme.label")}>
              <PaletteIcon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("theme.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
