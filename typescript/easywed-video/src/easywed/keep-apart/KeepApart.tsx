import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { ApartHookScene } from "./scenes/ApartHookScene";
import { ApartParentsScene } from "./scenes/ApartParentsScene";
import { ApartUncleScene } from "./scenes/ApartUncleScene";
import { ApartCtaScene } from "./scenes/ApartCtaScene";
import { KEEP_APART_SCENES, KEEP_APART_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: KEEP_APART_TRANSITION })}
  />
);

/** The 17 s keep-apart cut: Stół 6 taken away from the DJ, then one of the two family tables dragged across the dance floor, the CTA. */
export const KeepApart: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={KEEP_APART_SCENES.hook}>
          <ApartHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KEEP_APART_SCENES.uncle}>
          <ApartUncleScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KEEP_APART_SCENES.parents}>
          <ApartParentsScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KEEP_APART_SCENES.cta}>
          <ApartCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
