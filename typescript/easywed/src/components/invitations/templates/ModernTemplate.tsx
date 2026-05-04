import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { salutationLine, getFormatStyle, renderSeparator } from "./utils"
import type { TemplateProps } from "./types"
import type { InvitationTexts } from "@/stores/invitation.store"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"
import { isSeparatorId, isTxtId } from "@/lib/invitation/templates"

export function ModernTemplate({
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
    const fmt = getFormatStyle(key, fieldFormats)
    switch (key) {
      case "headline":
        return texts.headline ? (
          <p
            style={{
              fontFamily: ff,
              fontSize: "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: c.muted,
              marginBottom: "16px",
              fontWeight: 500,
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
              fontSize: "52px",
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
              color: c.text,
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
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
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
              fontSize: "15px",
              color: c.muted,
              marginBottom: "16px",
              ...fmt,
            }}
          >
            {texts.time}
          </p>
        ) : null

      case "venue":
        return texts.venue ? (
          <p
            style={{
              fontFamily: ff,
              fontSize: "15px",
              fontWeight: 600,
              marginBottom: "2px",
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
              fontSize: "13px",
              color: c.muted,
              marginBottom: "16px",
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
              fontSize: "12px",
              color: c.muted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "4px",
              ...fmt,
            }}
          >
            {t("invitations.template.confirm_by")} {texts.rsvpDeadline}
          </p>
        ) : null

      case "rsvpEmail":
        return texts.rsvpEmail ? (
          <p
            style={{
              fontFamily: ff,
              fontSize: "13px",
              color: c.accent,
              fontWeight: 500,
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
              fontSize: "13px",
              color: guestName ? c.text : c.muted,
              fontStyle: "italic",
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
              fontSize: "12px",
              color: c.muted,
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
      className="invitation-card modern-template"
      style={{
        width: "585px",
        height: "830px",
        backgroundColor: c.bg,
        fontFamily: fontCss,
        color: c.text,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px 80px",
        boxSizing: "border-box",
        position: "relative",
        pageBreakAfter: "always",
      }}
    >
      {sideFields.map((id) => {
        if (isSeparatorId(id)) {
          const sepContent = renderSeparator(
            separatorStyles?.[id] ?? "line",
            separatorConfigs?.[id] ?? {},
            c,
            {
              lineOpacity: 0.4,
              simpleOpacity: 0.35,
              ornamentOpacity: 0.6,
              lineMargin: "14px auto",
              ornamentMargin: "12px auto",
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
                fontSize: "14px",
                color: c.text,
                margin: "4px 0",
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
