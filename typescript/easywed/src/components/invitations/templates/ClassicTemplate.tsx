import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { salutationLine, getFormatStyle, renderSeparator } from "./utils"
import type { TemplateProps } from "./types"
import type { InvitationTexts } from "@/stores/invitation.store"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"
import { isSeparatorId, isTxtId } from "@/lib/invitation/templates"

export function ClassicTemplate({
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
              fontStyle: "italic",
              fontSize: "15px",
              letterSpacing: "0.12em",
              color: c.muted,
              marginBottom: "12px",
              textTransform: "uppercase",
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
              fontSize: "42px",
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: "8px",
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
              fontSize: "16px",
              letterSpacing: "0.08em",
              color: c.muted,
              marginTop: "8px",
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
              fontSize: "14px",
              letterSpacing: "0.06em",
              color: c.muted,
              marginTop: "4px",
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
              fontSize: "18px",
              fontWeight: 700,
              marginTop: "12px",
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
              marginTop: "4px",
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
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: "16px",
              ...fmt,
            }}
          >
            {t("invitations.template.rsvp_by")} {texts.rsvpDeadline}
          </p>
        ) : null

      case "rsvpEmail":
        return texts.rsvpEmail ? (
          <p
            style={{
              fontFamily: ff,
              fontSize: "13px",
              color: c.accent,
              marginTop: "4px",
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
              marginTop: "16px",
              fontStyle: "italic",
              fontSize: "14px",
              color: guestName ? c.text : c.muted,
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
              marginTop: "16px",
              fontSize: "12px",
              color: c.muted,
              fontStyle: "italic",
              textAlign: "center",
              maxWidth: "340px",
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
      className="invitation-card classic-template"
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
        padding: "56px 64px",
        boxSizing: "border-box",
        position: "relative",
        pageBreakAfter: "always",
      }}
    >
      {/* Outer border */}
      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: `1px solid ${c.border}`,
          pointerEvents: "none",
        }}
      />
      {/* Inner border */}
      <div
        style={{
          position: "absolute",
          inset: "26px",
          border: `0.5px solid ${c.border}`,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Decorative top rule */}
        <div
          style={{
            width: "80px",
            height: "1px",
            backgroundColor: c.accent,
            marginBottom: "24px",
          }}
        />

        {sideFields.map((id) => {
          if (isSeparatorId(id)) {
            const sepContent = renderSeparator(
              separatorStyles?.[id] ?? "line",
              separatorConfigs?.[id] ?? {},
              c,
              {
                lineOpacity: 0.55,
                simpleOpacity: 0.45,
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
              <span
                style={{ display: "block", width: "60%", height: "1.5em" }}
              />
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

        {/* Decorative bottom rule */}
        <div
          style={{
            width: "80px",
            height: "1px",
            backgroundColor: c.accent,
            marginTop: "28px",
          }}
        />
      </div>
    </div>
  )
}
