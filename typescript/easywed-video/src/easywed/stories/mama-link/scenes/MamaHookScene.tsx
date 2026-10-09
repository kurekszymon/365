import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../../../components/Backdrop";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import { MamaPhone } from "../components/MamaPhone";
import { PHONE_OUTER } from "../../../components/PhoneFrame";
import { PHOTO_PUSH } from "../script";
import { MAMA_STARTS } from "../timeline";

/** The hook's band over the phone - the keep-apart cut's, clear of a Reel's own caption. */
const LAYOUT = { padX: 48, padY: 150, hookSize: 84 };
/** The phone stands under the hook, as large as the frame below it allows. */
const PHONE_TOP = 520;
const PHONE_SCALE = 1.5;
/** The push in on the photo: how much closer, and the point it closes on, in the phone's CSS px. */
const PUSH_BY = 0.1;
const PUSH_AT = { x: 207, y: 330 };

/**
 * Mum's thread, her three questions landing one after another under the hook,
 * which is already up on frame 0. Then it scrolls back up to the photo of the
 * paper plan the couple sent before - the one she can't read.
 */
export const MamaHookScene: React.FC = () => {
  const frame = useCurrentFrame() + MAMA_STARTS.hook;
  const push = interpolate(frame, PHOTO_PUSH, [0, PUSH_BY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = PHONE_SCALE * (1 + push);
  return (
    <Backdrop>
      <div
        style={{
          position: "absolute",
          left: LAYOUT.padX,
          right: LAYOUT.padX,
          top: LAYOUT.padY,
          height: PHONE_TOP - LAYOUT.padY - 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.heading,
          fontSize: LAYOUT.hookSize,
          fontWeight: 600,
          letterSpacing: -2,
          lineHeight: 1.05,
          color: colors.ink,
          textAlign: "center",
        }}
      >
        {tl.mama.hook}
      </div>
      <div
        style={{
          position: "absolute",
          left: 540 - (PHONE_OUTER.width * PHONE_SCALE) / 2,
          top: PHONE_TOP,
          transformOrigin: "0 0",
          // Scaled about `PUSH_AT`, so the photo stays where it stands while the rest grows round it.
          transform: `translate(${-PUSH_AT.x * PHONE_SCALE * push}px, ${-PUSH_AT.y * PHONE_SCALE * push}px) scale(${scale})`,
        }}
      >
        <MamaPhone frame={frame} />
      </div>
    </Backdrop>
  );
};
