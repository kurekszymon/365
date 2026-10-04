import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { CaptionLine } from "../../components/CaptionLine";
import { tl } from "../../i18n";
import { InviteDesk } from "../components/InviteDesk";
import { CAPTION_IN } from "../script";
import { MAMA_STARTS } from "../timeline";

/** The caption takes the band above the laptop's screen. */
const CAPTION = { padX: 48, top: 150, height: 190, size: 60 };

/**
 * The couple's laptop: the planner on their saved wedding, the dashed invite
 * circle in the header pressed, and the *Członkowie* dialog - the role set to
 * *Podgląd*, the link created, then copied - with the caption line once it is.
 */
export const MamaInviteScene: React.FC = () => {
  const frame = useCurrentFrame() + MAMA_STARTS.invite;
  const captionIn = interpolate(frame, CAPTION_IN, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  return (
    <Backdrop>
      <InviteDesk frame={frame} />
      <div
        style={{
          position: "absolute",
          left: CAPTION.padX,
          right: CAPTION.padX,
          top: CAPTION.top,
          height: CAPTION.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CaptionLine text={tl.mama.captionLine} enter={captionIn} size={CAPTION.size} />
      </div>
    </Backdrop>
  );
};
