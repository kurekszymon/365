import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { getFormatStyle, renderSeparator, salutationLine } from "./utils"
import type { TemplateProps } from "./types"
import type { InvitationTexts } from "@/stores/invitation.store"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"
import {
  TEMPLATE_FIELD_STYLES,
  isSeparatorId,
  isTxtId,
} from "@/lib/invitation/templates"

export function RomanticTemplate({
  texts,
  colorScheme,
  fontCss,
  fieldFonts,
  fieldFormats,
  separatorStyles,
  separatorConfigs,
  textBlocks,
  guestName,
  side,
  fieldSides,
  fieldOrder,
  wrapField,
}: TemplateProps) {
  const { t } = useTranslation()
  const c = COLOR_SCHEMES[colorScheme]
  const greeting = salutationLine(texts.guestSalutation, guestName)

  const sideFields = fieldOrder.filter((k) => fieldSides[k] === side)

  function renderField(key: keyof InvitationTexts) {
    const ff = fieldFonts?.[key]
    const fmt = getFormatStyle(
      key,
      fieldFormats,
      TEMPLATE_FIELD_STYLES.romantic[key]
    )
    switch (key) {
      case "headline":
        return texts.headline ? (
          <p
            style={{
              fontFamily: ff,
              fontStyle: "italic",
              fontWeight: 300,
              letterSpacing: "0.08em",
              color: c.muted,
              marginBottom: "12px",
              ...fmt,
            }}
          >
            {texts.headline}
          </p>
        ) : null

      case "coupleNames":
        return (
          <h1
            style={{
              fontFamily: ff,
              fontWeight: 600,
              lineHeight: 1.1,
              color: c.text,
              marginBottom: "6px",
              ...fmt,
            }}
          >
            {texts.coupleNames}
          </h1>
        )

      case "date":
        return texts.date ? (
          <p
            style={{
              fontFamily: ff,
              fontWeight: 300,
              letterSpacing: "0.06em",
              marginBottom: "4px",
              ...fmt,
            }}
          >
            {texts.date}
          </p>
        ) : null

      case "time":
        return texts.time ? (
          <p
            style={{
              fontFamily: ff,
              color: c.muted,
              fontStyle: "italic",
              marginBottom: "12px",
              ...fmt,
            }}
          >
            {t("invitations.template.time_prefix")} {texts.time}
          </p>
        ) : null

      case "venue":
        return texts.venue ? (
          <p
            style={{
              fontFamily: ff,
              fontWeight: 600,
              marginBottom: "3px",
              ...fmt,
            }}
          >
            {texts.venue}
          </p>
        ) : null

      case "venueAddress":
        return texts.venueAddress ? (
          <p
            style={{
              fontFamily: ff,
              color: c.muted,
              fontStyle: "italic",
              marginBottom: "12px",
              ...fmt,
            }}
          >
            {texts.venueAddress}
          </p>
        ) : null

      case "rsvpDeadline":
        return texts.rsvpDeadline ? (
          <p
            style={{
              fontFamily: ff,
              color: c.muted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "4px",
              ...fmt,
            }}
          >
            {t("invitations.template.please_confirm_by")} {texts.rsvpDeadline}
          </p>
        ) : null

      case "rsvpEmail":
        return texts.rsvpEmail ? (
          <p
            style={{
              fontFamily: ff,
              color: c.accent,
              fontStyle: "italic",
              marginBottom: "8px",
              ...fmt,
            }}
          >
            {texts.rsvpEmail}
          </p>
        ) : null

      case "guestSalutation":
        return greeting ? (
          <p
            style={{
              fontFamily: ff,
              fontStyle: "italic",
              fontWeight: 300,
              color: guestName ? c.text : c.muted,
              marginBottom: "8px",
              ...fmt,
            }}
          >
            {greeting}
          </p>
        ) : null

      case "footer":
        return texts.footer ? (
          <p
            style={{
              fontFamily: ff,
              fontStyle: "italic",
              fontWeight: 300,
              color: c.muted,
              maxWidth: "360px",
              marginBottom: "8px",
              ...fmt,
            }}
          >
            {texts.footer}
          </p>
        ) : null

      default:
        return null
    }
  }

  return (
    <div
      className="invitation-card romantic-template"
      style={{
        width: "585px",
        height: "830px",
        backgroundColor: c.bg,
        fontFamily: fontCss,
        color: c.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 72px",
        boxSizing: "border-box",
        position: "relative",
        textAlign: "center",
        pageBreakAfter: "always",
      }}
    >
      {sideFields.map((id) => {
        if (isSeparatorId(id)) {
          // Romantic defaults: 80% width, 0.5px thickness (spread first so user config overrides)
          const sepContent = renderSeparator(
            separatorStyles?.[id] ?? "line",
            {
              widthPct: 80,
              thicknessPx: 0.5,
              ...(separatorConfigs?.[id] ?? {}),
            },
            c,
            {
              lineOpacity: 0.5,
              simpleOpacity: 0.5,
              ornamentOpacity: 0.65,
              lineMargin: "12px auto",
              ornamentMargin: "10px auto",
            }
          )
          return wrapField ? (
            wrapField(id, sepContent)
          ) : (
            <Fragment key={id}>{sepContent}</Fragment>
          )
        }
        if (isTxtId(id)) {
          const txt = textBlocks?.[id] ?? ""
          if (!txt && !wrapField) return null
          const fmt = getFormatStyle(id, fieldFormats)
          const content = txt ? (
            <p
              style={{
                fontFamily: fieldFonts?.[id],
                fontSize: "14px",
                color: c.text,
                margin: "4px 0",
                textAlign: "center",
                ...fmt,
              }}
            >
              {txt}
            </p>
          ) : (
            <span style={{ display: "block", width: "60%", height: "1.5em" }} />
          )
          return wrapField ? (
            wrapField(id, content)
          ) : (
            <Fragment key={id}>{content}</Fragment>
          )
        }
        const key = id as keyof InvitationTexts
        const content = renderField(key)
        if (!content) return null
        return wrapField ? (
          wrapField(id, content)
        ) : (
          <Fragment key={id}>{content}</Fragment>
        )
      })}
    </div>
  )
}
