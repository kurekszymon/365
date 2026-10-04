import React from "react";
import { useCurrentFrame } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { MamaPhone } from "../components/MamaPhone";
import { PHONE_OUTER } from "../../components/PhoneFrame";
import { MAMA_STARTS } from "../timeline";

/** Nothing is written over this beat, so the phone takes the frame, clear of a Reel's caption at the bottom. */
export const PHONE_SCENE_SCALE = 1.9;
export const PHONE_SCENE_TOP = 150;

/** Mum's phone, placed as this beat places it - shared with the call to action, which recedes from it. */
export const PhoneShot: React.FC<{ frame: number }> = ({ frame }) => (
  <div
    style={{
      position: "absolute",
      left: 540 - (PHONE_OUTER.width * PHONE_SCENE_SCALE) / 2,
      top: PHONE_SCENE_TOP,
      transformOrigin: "0 0",
      transform: `scale(${PHONE_SCENE_SCALE})`,
    }}
  >
    <MamaPhone frame={frame} />
  </div>
);

/**
 * Back on mum's phone: the link lands in her thread and she taps it, signs in,
 * the invite is claimed, and the plan opens read-only. She opens *Goście*,
 * types the name she knows him by, and one row is left - the table he sits at.
 */
export const MamaPhoneScene: React.FC = () => {
  const frame = useCurrentFrame() + MAMA_STARTS.phone;
  return (
    <Backdrop>
      <PhoneShot frame={frame} />
    </Backdrop>
  );
};
