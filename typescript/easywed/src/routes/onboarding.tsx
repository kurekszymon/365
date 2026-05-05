import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { CalendarIcon, LandmarkIcon, UsersIcon } from "lucide-react"
import type { UserType } from "@/stores/global.store"
import { requireAuth } from "@/lib/auth/guards"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    requireAuth("/onboarding")
  },
  component: Onboarding,
})

type Option = {
  type: UserType
  icon: React.ReactNode
  titleKey: string
  descKey: string
  paid: boolean
}

const OPTIONS: Array<Option> = [
  {
    type: "couple",
    icon: <UsersIcon className="size-6" />,
    titleKey: "onboarding.couple.title",
    descKey: "onboarding.couple.desc",
    paid: false,
  },
  {
    type: "planner",
    icon: <CalendarIcon className="size-6" />,
    titleKey: "onboarding.planner.title",
    descKey: "onboarding.planner.desc",
    paid: true,
  },
  {
    type: "venue",
    icon: <LandmarkIcon className="size-6" />,
    titleKey: "onboarding.venue.title",
    descKey: "onboarding.venue.desc",
    paid: true,
  },
]

function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const setUserType = useGlobalStore((s) => s.setUserType)
  const [selected, setSelected] = useState<UserType | null>(null)
  const [saving, setSaving] = useState(false)

  const handleContinue = async () => {
    if (!selected || !session || saving) return
    setSaving(true)

    const { error } = await supabase
      .from("profiles")
      .update({ user_type: selected })
      .eq("id", session.user.id)

    if (error) {
      console.error("[onboarding] failed to save user type", error)
      setSaving(false)
      return
    }

    setUserType(selected)

    if (selected === "couple") {
      void navigate({ to: "/", replace: true })
    } else {
      void navigate({ to: "/upgrade", replace: true })
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-lg flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("onboarding.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("onboarding.subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => setSelected(opt.type)}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-accent",
                selected === opt.type &&
                  "border-primary bg-primary/5 ring-1 ring-primary"
              )}
            >
              <div className="mt-0.5 shrink-0 text-muted-foreground">
                {opt.icon}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{t(opt.titleKey)}</span>
                <span className="text-sm text-muted-foreground">
                  {t(opt.descKey)}
                </span>
              </div>
            </button>
          ))}
        </div>

        <Button onClick={handleContinue} disabled={!selected || saving}>
          {saving ? t("onboarding.saving") : t("common.create")}
        </Button>
      </div>
    </div>
  )
}
