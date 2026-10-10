import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../../theme";
import { MamaHookScene } from "./scenes/MamaHookScene";
import { MamaInviteScene } from "./scenes/MamaInviteScene";
import { MamaPhoneScene } from "./scenes/MamaPhoneScene";
import { MamaCtaScene } from "./scenes/MamaCtaScene";
import { MAMA_SCENES, MAMA_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: MAMA_TRANSITION })}
  />
);

/** The 18 s mama-link cut: mum's questions, a view-only link made on the laptop, mum finding the uncle on her own phone, the CTA. */
export const MamaLink: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={MAMA_SCENES.hook}>
          <MamaHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={MAMA_SCENES.invite}>
          <MamaInviteScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={MAMA_SCENES.phone}>
          <MamaPhoneScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={MAMA_SCENES.cta}>
          <MamaCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
