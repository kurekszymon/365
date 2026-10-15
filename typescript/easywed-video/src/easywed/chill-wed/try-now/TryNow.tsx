import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../../theme";
import { TryNowHookScene } from "./scenes/TryNowHookScene";
import { TryNowTableScene } from "./scenes/TryNowTableScene";
import { TryNowSeatScene } from "./scenes/TryNowSeatScene";
import { TryNowCtaScene } from "./scenes/TryNowCtaScene";
import { TRY_NOW_SCENES, TRY_NOW_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TRY_NOW_TRANSITION })}
  />
);

/** The 25.5 s try-now speedrun: a stopwatch from the landing page to the first guest seated at a table - no account, no cut in the run - the CTA. */
export const TryNow: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TRY_NOW_SCENES.hook}>
          <TryNowHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TRY_NOW_SCENES.table}>
          <TryNowTableScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TRY_NOW_SCENES.seat}>
          <TryNowSeatScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TRY_NOW_SCENES.cta}>
          <TryNowCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
