import React from "react";
import { interpolate } from "remotion";
import { Icon } from "../../../components/Icon";
import { colors, fonts } from "../../../theme";
import { PHONE } from "../../../components/PhoneFrame";

/**
 * A message thread between mum and Ania, deliberately generic: no messaging
 * app's colours, bubble shapes or logo, just the film's own palette - the
 * phone owner's messages on the right in brand green, the other side's on the
 * left as neutral cards. Laid out in CSS pixels inside `PhoneFrame`.
 */

export type Message = {
  /** "out" is the phone owner's own message; "in" is from the other side. */
  side: "in" | "out";
  /** Arrival, 0..1: the thread makes room for it, and it rises into place. */
  enter: number;
  content: React.ReactNode;
  /** A photo sits in the bubble edge to edge rather than behind padding. */
  bare?: boolean;
};

const HEADER = 58;
const COMPOSER = 70;
/** The messages' font, a size mum reads without her glasses. */
export const MESSAGE_SIZE = 18;

const Bubble: React.FC<{ message: Message }> = ({ message }) => {
  const { side, enter, content, bare } = message;
  const out = side === "out";
  const e = Math.min(1, Math.max(0, enter));
  return (
    // Grows from nothing to its own height, so the thread above slides up as it lands.
    <div style={{ display: "grid", gridTemplateRows: `${e}fr` }}>
      <div style={{ minHeight: 0, display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
        <div
          style={{
            maxWidth: "78%",
            padding: bare ? 4 : "10px 14px",
            borderRadius: 20,
            borderBottomRightRadius: out ? 6 : 20,
            borderBottomLeftRadius: out ? 20 : 6,
            backgroundColor: out ? colors.brandGreen : colors.card,
            border: out ? "none" : `1px solid ${colors.border}`,
            fontFamily: fonts.sans,
            fontSize: MESSAGE_SIZE,
            lineHeight: "24px",
            color: out ? "#ffffff" : colors.ink,
            opacity: interpolate(e, [0.3, 1], [0, 1], { extrapolateLeft: "clamp" }),
            transform: `translateY(${(1 - e) * 14}px) scale(${interpolate(e, [0, 1], [0.94, 1])})`,
            transformOrigin: out ? "bottom right" : "bottom left",
            overflow: "hidden",
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};

export const ChatThread: React.FC<{
  /** The other person's name, over the thread. */
  name: string;
  messages: Message[];
}> = ({ name, messages }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      backgroundColor: colors.bg,
      fontFamily: fonts.sans,
    }}
  >
    <div
      style={{
        height: HEADER,
        boxSizing: "content-box",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: `${PHONE.safeTop}px 16px 0`,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
      }}
    >
      <Icon name="chevronLeft" color={colors.ink} size={24} />
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          backgroundColor: colors.accentSoft,
          color: colors.accent,
          fontSize: 17,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {name.charAt(0)}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: colors.ink }}>{name}</div>
    </div>

    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "16px 14px",
        }}
      >
        {messages.map((message, i) => (
          <Bubble key={i} message={message} />
        ))}
      </div>
    </div>

    <div
      style={{
        height: COMPOSER,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 14px 8px",
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
      }}
    >
      <Icon name="plus" color={colors.inkSoft} size={24} />
      <div style={{ flex: 1, height: 40, borderRadius: 999, border: `1px solid ${colors.border}`, backgroundColor: colors.bg }} />
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          backgroundColor: colors.bgDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="arrowRight" color={colors.inkSoft} size={20} />
      </div>
    </div>
  </div>
);
