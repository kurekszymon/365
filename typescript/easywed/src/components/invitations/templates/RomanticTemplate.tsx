import type { TemplateProps } from "./types"

const SCHEMES: Record<
  string,
  { bg: string; border: string; accent: string; text: string; muted: string }
> = {
  blush: {
    bg: "#fdf5f5",
    border: "#d4a0a0",
    accent: "#c9728a",
    text: "#3d1f2a",
    muted: "#9a7080",
  },
  lavender: {
    bg: "#f7f5fd",
    border: "#b0a0d0",
    accent: "#7c5cbf",
    text: "#2a1f3d",
    muted: "#7a6a9a",
  },
  "dusty-rose": {
    bg: "#fdf2ee",
    border: "#c8a898",
    accent: "#a06050",
    text: "#3d2018",
    muted: "#9a7060",
  },
}

const CORNER = "❧"

function salutationLine(salutation: string, guestName?: string): string | null {
  if (guestName) return `${salutation || "Drogi/a"} ${guestName}`
  if (salutation) return `${salutation} …`
  return null
}

export function RomanticTemplate({
  texts,
  colorScheme,
  fontCss,
  guestName,
}: TemplateProps) {
  const c = SCHEMES[colorScheme] ?? SCHEMES["blush"]
  const greeting = salutationLine(texts.guestSalutation, guestName)

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

      {/* Headline */}
      {texts.headline && (
        <p
          style={{
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "18px",
            letterSpacing: "0.08em",
            color: c.muted,
            marginBottom: "16px",
          }}
        >
          {texts.headline}
        </p>
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

      {/* Couple names */}
      <h1
        style={{
          fontSize: "48px",
          fontWeight: 600,
          lineHeight: 1.1,
          color: c.text,
          marginBottom: "6px",
        }}
      >
        {texts.coupleNames || "Anna & Piotr"}
      </h1>

      {/* Bottom floral divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          margin: "20px 0",
          width: "70%",
        }}
      >
        <div style={{ flex: 1, height: "0.5px", backgroundColor: c.border }} />
        <span style={{ color: c.accent, fontSize: "18px", lineHeight: 1 }}>
          ✿
        </span>
        <div style={{ flex: 1, height: "0.5px", backgroundColor: c.border }} />
      </div>

      {/* Date + time */}
      {(texts.date || texts.time) && (
        <div style={{ marginBottom: "16px" }}>
          <p
            style={{
              fontSize: "20px",
              fontWeight: 300,
              letterSpacing: "0.06em",
            }}
          >
            {texts.date}
          </p>
          {texts.time && (
            <p
              style={{
                fontSize: "15px",
                color: c.muted,
                fontStyle: "italic",
                marginTop: "4px",
              }}
            >
              godz. {texts.time}
            </p>
          )}
        </div>
      )}

      {/* Venue */}
      {texts.venue && (
        <div style={{ marginTop: "8px" }}>
          <p style={{ fontSize: "17px", fontWeight: 600 }}>{texts.venue}</p>
          {texts.venueAddress && (
            <p
              style={{
                fontSize: "13px",
                color: c.muted,
                fontStyle: "italic",
                marginTop: "3px",
              }}
            >
              {texts.venueAddress}
            </p>
          )}
        </div>
      )}

      {/* RSVP */}
      {(texts.rsvpEmail || texts.rsvpDeadline) && (
        <div style={{ marginTop: "24px" }}>
          {texts.rsvpDeadline && (
            <p
              style={{
                fontSize: "12px",
                color: c.muted,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Proszę o potwierdzenie do {texts.rsvpDeadline}
            </p>
          )}
          {texts.rsvpEmail && (
            <p
              style={{
                fontSize: "13px",
                color: c.accent,
                fontStyle: "italic",
                marginTop: "2px",
              }}
            >
              {texts.rsvpEmail}
            </p>
          )}
        </div>
      )}

      {/* Guest salutation — muted placeholder in preview, full colour at print time */}
      {greeting && (
        <p
          style={{
            marginTop: "24px",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "15px",
            color: guestName ? c.text : c.muted,
          }}
        >
          {greeting}
        </p>
      )}

      {/* Footer */}
      {texts.footer && (
        <p
          style={{
            marginTop: "20px",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "13px",
            color: c.muted,
            maxWidth: "360px",
          }}
        >
          {texts.footer}
        </p>
      )}
    </div>
  )
}
