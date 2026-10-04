import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { NAV_ITEMS } from "../../components/Icon";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { guestListFor, INVITE_URL } from "../guests";
import { MAMA_STARTS } from "../timeline";
import {
  BUBBLE_OVER,
  BUBBLES_IN,
  CLAIMING,
  DRAWER_UP,
  LINK_IN,
  SIGN_IN,
  TAP_GOOGLE,
  TAP_GUESTS,
  TAP_LINK,
  TAP_SEARCH,
  TYPE_FROM,
  TYPE_STEP,
  VIEWER,
} from "../script";
import { ChatThread, type Message } from "./ChatThread";
import { PhoneFrame, Touch } from "../../components/PhoneFrame";
import { PhoneShell, searchAt, tabAt } from "../../components/PhoneShell";
import { SketchPhoto } from "./SketchPhoto";
import { ClaimingScreen, GOOGLE_BUTTON_AT, SignInScreen } from "./WebScreens";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Where the link bubble sits once it has landed, in the phone's CSS px - for mum's thumb. */
const LINK_AT = { x: 150, y: 640 };

/**
 * The thread at `frame` on the cut's clock. Under the hook it is Ania's phone -
 * the hook is hers - with the photo she sent and mum's three questions coming
 * in. From the phone beat on it is mum's: the same thread from her side, the
 * link arriving and her thumb on it; the sign-in page and the claim; then the plan itself, the guest list
 * opened and her search typed in. Drawn at the phone's own size - the scene
 * places and scales it.
 */
export const MamaPhone: React.FC<{ frame: number }> = ({ frame }) => {
  const { hall } = useFormat();
  const guests = guestListFor(hall);

  const arrive = (from: number) => interpolate(frame, [from, from + BUBBLE_OVER], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const linkIn = interpolate(frame, LINK_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  // Whose phone it is: Ania's until the laptop has sent the link, then mum's.
  const anias = frame < MAMA_STARTS.phone;
  const fromAnia = anias ? "out" : "in";
  const fromMum = anias ? "in" : "out";

  const messages: Message[] = [
    { side: fromAnia, enter: 1, bare: true, content: <SketchPhoto width={250} height={320} /> },
    ...tl.mama.bubbles.map(
      (text, i): Message => ({ side: fromMum, enter: arrive(BUBBLES_IN[i]), content: text }),
    ),
    {
      side: fromAnia,
      enter: linkIn,
      content: (
        <span style={{ fontSize: 16, lineHeight: "22px", color: colors.accent, textDecoration: "underline", wordBreak: "break-all" }}>
          {INVITE_URL}
        </span>
      ),
    },
  ];

  const typed = Math.max(0, Math.min(tl.mama.search.length, Math.floor((frame - TYPE_FROM) / TYPE_STEP) + 1));
  const query = tl.mama.search.slice(0, typed);

  // Each screen crossfades over the one before it.
  const signIn = interpolate(frame, SIGN_IN, [0, 1], clamp);
  const claiming = interpolate(frame, CLAIMING, [0, 1], clamp);
  const viewer = interpolate(frame, VIEWER, [0, 1], clamp);
  const sheet = interpolate(frame, DRAWER_UP, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  // `useTabBadgeCounts`: unseated guests, tables, fixtures - the dance floor is
  // one - and open reminders, the films' one.
  const reminders = NAV_ITEMS.find((item) => item.kind === "reminders")?.badge ?? 0;
  const badges = [
    guests.filter((guest) => !guest.table).length,
    hall.tables.length,
    hall.fixtures.length + 1,
    reminders,
  ];

  return (
    <PhoneFrame>
      {viewer < 1 ? <ChatThread name={anias ? tl.mama.mum : tl.mama.sender} messages={messages} /> : null}
      {signIn > 0 && claiming < 1 ? (
        <AbsoluteFill style={{ opacity: signIn }}>
          <SignInScreen googlePressed={frame >= TAP_GOOGLE && frame < TAP_GOOGLE + 4} />
        </AbsoluteFill>
      ) : null}
      {claiming > 0 && viewer < 1 ? (
        <AbsoluteFill style={{ opacity: claiming }}>
          <ClaimingScreen />
        </AbsoluteFill>
      ) : null}
      {viewer > 0 ? (
        <AbsoluteFill style={{ opacity: viewer }}>
          <PhoneShell hall={hall} guests={guests} badges={badges} sheet={sheet} query={query} />
        </AbsoluteFill>
      ) : null}

      <div style={{ position: "absolute", inset: 0, fontFamily: fonts.sans }}>
        <Touch frame={frame} at={TAP_LINK} x={LINK_AT.x} y={LINK_AT.y} />
        <Touch frame={frame} at={TAP_GOOGLE} x={GOOGLE_BUTTON_AT.x} y={GOOGLE_BUTTON_AT.y} />
        <Touch frame={frame} at={TAP_GUESTS} x={tabAt(0).x} y={tabAt(0).y} />
        <Touch frame={frame} at={TAP_SEARCH} x={searchAt(guests, "").x} y={searchAt(guests, "").y} />
      </div>
    </PhoneFrame>
  );
};
