import React from "react";
import { Icon, type IconName } from "../../components/Icon";
import { tl } from "../../i18n";
import { colors } from "../../theme";

/**
 * `Onboarding/OnboardingChecklist.tsx` at easywed/v1.1.2 as a phone draws it:
 * the card in the canvas's top-right corner (`top-3` on a phone, where the
 * desktop toolbar isn't). Its steps tick themselves off from the plan -
 * `[hasTables, hasGuests, allSeated]` - and the bar fills with them. A
 * session that started unfinished keeps the card once all three are done, and
 * it turns into the done card (`onboarding.done.*`): the bar and the steps go,
 * the print and share buttons come. Sizes are the app's CSS pixels.
 */

/** `right-3 top-3 w-[17.5rem] p-3.5`. */
export const CARD = { right: 12, top: 12, width: 280, pad: 14 };

const Row: React.FC<{ index: number; title: string; detail: string; done: boolean; cta?: string }> = ({
  index,
  title,
  detail,
  done,
  cta,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: 999,
        backgroundColor: done ? colors.primary : colors.muted,
        color: colors.inkSoft,
        fontSize: 10,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {done ? <Icon name="check" color={colors.primaryInk} size={12} /> : index}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.25,
          fontWeight: 500,
          color: done ? colors.inkSoft : colors.ink,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 11,
          lineHeight: 1.5,
          color: colors.inkSoft,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {detail}
      </div>
    </div>
    {/* A finished row keeps no button; the rest get an `xs` outline one. */}
    {!done && cta ? (
      <div
        style={{
          height: 24,
          padding: "0 8px",
          boxSizing: "border-box",
          flexShrink: 0,
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bg,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          fontSize: 12,
          fontWeight: 500,
          color: colors.ink,
          display: "flex",
          alignItems: "center",
        }}
      >
        {cta}
      </div>
    ) : null}
  </div>
);

/** The done card's two `sm` buttons, `flex-1` each: *Drukuj* filled, *Udostępnij* outline. */
const DoneButton: React.FC<{ icon: IconName; label: string; filled: boolean }> = ({ icon, label, filled }) => (
  <div
    style={{
      flex: 1,
      height: 32,
      boxSizing: "border-box",
      borderRadius: 8,
      border: filled ? "none" : `1px solid ${colors.border}`,
      backgroundColor: filled ? colors.primary : colors.bg,
      boxShadow: filled ? undefined : "0 1px 2px rgba(0, 0, 0, 0.05)",
      color: filled ? colors.primaryInk : colors.ink,
      fontSize: 14,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}
  >
    <Icon name={icon} color={filled ? colors.primaryInk : colors.ink} size={16} />
    {label}
  </div>
);

export const OnboardingCard: React.FC<{ tables: number; guests: number; seated: number }> = ({ tables, guests, seated }) => {
  const o = tl.app.onboarding;
  const hasTables = tables > 0;
  const hasGuests = guests > 0;
  const allSeated = hasGuests && seated === guests;
  const doneCount = [hasTables, hasGuests, allSeated].filter(Boolean).length;
  const allDone = doneCount === 3;

  return (
    <div
      style={{
        position: "absolute",
        right: CARD.right,
        top: CARD.top,
        width: CARD.width,
        boxSizing: "border-box",
        padding: CARD.pad,
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        backgroundColor: `${colors.card}f2`,
        backdropFilter: "blur(4px)",
        boxShadow: "0 8px 20px -12px rgba(40, 60, 45, 0.4)",
      }}
    >
      <div style={{ marginBottom: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, lineHeight: 1.25, fontWeight: 600, color: colors.ink }}>
            {allDone ? o.doneTitle : o.title}
          </div>
          {allDone ? <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: colors.inkSoft }}>{o.doneDesc}</div> : null}
        </div>
        {/* The dismiss X, `icon-xs` ghost, pulled into the corner by `-mt-1 -mr-1`. */}
        <div style={{ width: 24, height: 24, margin: "-4px -4px 0 0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" color={colors.ink} size={12} />
        </div>
      </div>
      {allDone ? (
        <div style={{ display: "flex", gap: 8 }}>
          <DoneButton icon="printer" label={o.print} filled />
          <DoneButton icon="share2" label={o.share} filled={false} />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, height: 4, borderRadius: 999, backgroundColor: colors.muted, overflow: "hidden" }}>
            <div style={{ width: `${(doneCount / 3) * 100}%`, height: "100%", borderRadius: 999, backgroundColor: colors.primary }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row index={1} title={o.tablesTitle} detail={hasTables ? tl.print.tablesCount(tables) : o.tablesTodo} done={hasTables} cta={o.add} />
            <Row index={2} title={o.guestsTitle} detail={hasGuests ? tl.guests.count(guests) : o.guestsTodo} done={hasGuests} cta={o.add} />
            {/* No button while nobody is on the list - step 2's is the one to press. */}
            <Row
              index={3}
              title={o.seatsTitle}
              detail={tl.guests.seatedRatio(seated, guests)}
              done={allSeated}
              cta={hasGuests ? o.seat : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
};
