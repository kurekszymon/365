import { useTranslation } from "react-i18next"
import { ClassicTemplate } from "./templates/ClassicTemplate"
import { ModernTemplate } from "./templates/ModernTemplate"
import { RomanticTemplate } from "./templates/RomanticTemplate"
import {
  DEFAULT_FIELD_ORDER,
  DEFAULT_FIELD_SIDES,
  TEMPLATES,
  getDefaultTexts,
} from "@/lib/invitation/templates"
import { getFontCss } from "@/lib/invitation/fonts"
import { useInvitationStore } from "@/stores/invitation.store"
import { cn } from "@/lib/utils"

const TEMPLATE_COMPONENTS = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  romantic: RomanticTemplate,
}

export function TemplateGallery() {
  const { t } = useTranslation()
  const template = useInvitationStore((s) => s.design.template)

  const PREVIEW_TEXTS = getDefaultTexts(t)
  const fontId = useInvitationStore((s) => s.design.fontId)
  const updateDesign = useInvitationStore((s) => s.updateDesign)
  const fontCss = getFontCss(fontId)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{t("invitations.step_template")}</p>
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map((tmpl) => {
          const Component = TEMPLATE_COMPONENTS[tmpl.id]
          const isActive = template === tmpl.id

          return (
            <button
              key={tmpl.id}
              onClick={() =>
                updateDesign({
                  template: tmpl.id,
                  colorScheme: tmpl.defaultColorScheme,
                })
              }
              className={cn(
                "group flex flex-col items-center gap-2 rounded-lg border-2 p-2 transition-all",
                isActive
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Thumbnail — scaled down from 585×830 to fit ~99px column (scale 0.169) */}
              <div
                className="w-full overflow-hidden rounded"
                style={{ aspectRatio: "585 / 830" }}
              >
                <div
                  style={{
                    transform: "scale(0.169)",
                    transformOrigin: "top left",
                    width: "585px",
                    height: "830px",
                    pointerEvents: "none",
                  }}
                >
                  <Component
                    texts={PREVIEW_TEXTS}
                    colorScheme={tmpl.defaultColorScheme}
                    fontCss={fontCss}
                    side="front"
                    fieldSides={DEFAULT_FIELD_SIDES}
                    fieldOrder={DEFAULT_FIELD_ORDER}
                  />
                </div>
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive && "text-primary"
                )}
              >
                {t(tmpl.labelKey)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
