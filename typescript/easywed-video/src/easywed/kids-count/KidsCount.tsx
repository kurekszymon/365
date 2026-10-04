import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { KidsHookScene } from "./scenes/KidsHookScene";
import { KidsTagScene } from "./scenes/KidsTagScene";
import { KidsCountScene } from "./scenes/KidsCountScene";
import { KidsCtaScene } from "./scenes/KidsCtaScene";
import { KIDS_SCENES, KIDS_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: KIDS_TRANSITION })}
  />
);

/** The 17 s kids cut: a list of adults, two brackets typed in, the count, the call to action. */
export const KidsCount: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={KIDS_SCENES.hook}>
          <KidsHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KIDS_SCENES.tag}>
          <KidsTagScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KIDS_SCENES.count}>
          <KidsCountScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KIDS_SCENES.cta}>
          <KidsCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
