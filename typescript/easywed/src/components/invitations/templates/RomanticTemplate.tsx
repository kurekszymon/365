import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { salutationLine, getFormatStyle } from "./utils"
import type { TemplateProps } from "./types"
import type { InvitationTexts } from "@/stores/invitation.store"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"
import { isSeparatorId } from "@/lib/invitation/templates"

const CORNER = "❧"

export function RomanticTemplate({
  texts,
  colorScheme,
  fontCss,
  fieldFonts,
  fieldFormats,
  separatorStyles,
  separatorConfigs,
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
              fontWeight: 300,
              fontSize: "18px",
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
              fontSize: "48px",
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
              fontSize: "20px",
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
              fontSize: "15px",
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
              fontSize: "17px",
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
              fontSize: "13px",
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
              fontSize: "12px",
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
              fontSize: "13px",
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
              fontSize: "15px",
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
              fontSize: "13px",
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
      {/* Decorative border */}
      <div
        style={{
          position: "absolute",
          inset: "16px",
          border: `1.5px solid ${c.border}`,
          pointerEvents: "none",
        }}
      />

      {/* Corner ornaments */}
      {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map(
        (pos) => (
          <span
            key={pos}
            style={{
              position: "absolute",
              fontSize: "20px",
              color: c.accent,
              opacity: 0.6,
              ...(pos === "topLeft" && { top: "8px", left: "8px" }),
              ...(pos === "topRight" && {
                top: "8px",
                right: "8px",
                transform: "scaleX(-1)",
              }),
              ...(pos === "bottomLeft" && {
                bottom: "8px",
                left: "8px",
                transform: "scaleY(-1)",
              }),
              ...(pos === "bottomRight" && {
                bottom: "8px",
                right: "8px",
                transform: "scale(-1,-1)",
              }),
            }}
          >
            {CORNER}
          </span>
        )
      )}

      {/* Top floral divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "24px",
          width: "70%",
        }}
      >
        <div style={{ flex: 1, height: "0.5px", backgroundColor: c.border }} />
        <span style={{ color: c.accent, fontSize: "18px", lineHeight: 1 }}>
          ✿
        </span>
        <div style={{ flex: 1, height: "0.5px", backgroundColor: c.border }} />
      </div>

      {sideFields.map((id) => {
        if (isSeparatorId(id)) {
          const style = separatorStyles?.[id] ?? "line"
          const cfg = separatorConfigs?.[id] ?? {}
          const w = `${cfg.widthPct ?? 80}%`
          const h = cfg.thicknessPx ?? 0.5
          const lineEl = <div style={{ flex: 1, height: h, backgroundColor: c.border, opacity: 0.5 }} />
          const sepContent =
            style === "line" ? (
              <div style={{ width: w, height: h, backgroundColor: c.border, opacity: 0.5, margin: "12px auto" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px auto", width: w }}>
                {lineEl}
                <span style={{ color: c.accent, fontSize: "11px", opacity: 0.65, lineHeight: 1, flexShrink: 0, fontFamily: "serif" }}>
                  {style === "heart" ? "♥" : style === "flower" ? "✿" : style === "star" ? "✦" : "◆"}
                </span>
                {lineEl}
              </div>
            )
          return wrapField ? (
            wrapField(id, sepContent)
          ) : (
            <Fragment key={id}>{sepContent}</Fragment>
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

      {/* Bottom floral divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "16px",
          width: "70%",
        }}
      >
        <div style={{ flex: 1, height: "0.5px", backgroundColor: c.border }} />
        <span style={{ color: c.accent, fontSize: "18px", lineHeight: 1 }}>
          ✿
        </span>
        <div style={{ flex: 1, height: "0.5px", backgroundColor: c.border }} />
      </div>
    </div>
  )
}
