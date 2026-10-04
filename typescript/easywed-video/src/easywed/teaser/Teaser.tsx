import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { HookScene } from "./scenes/HookScene";
import { ChaosScene } from "./scenes/ChaosScene";
import { PlanScene } from "./scenes/PlanScene";
import { CtaScene } from "./scenes/CtaScene";
import { TEASER_SCENES, TEASER_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TEASER_TRANSITION })}
  />
);

/** The 15 s cut: the question, the paper it takes today, the plan, the CTA. */
export const Teaser: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TEASER_SCENES.hook}>
          <HookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TEASER_SCENES.chaos}>
          <ChaosScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TEASER_SCENES.plan}>
          <PlanScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TEASER_SCENES.cta}>
          <CtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
