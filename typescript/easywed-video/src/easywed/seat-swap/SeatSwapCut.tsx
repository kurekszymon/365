import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { SwapCutHookScene } from "./scenes/SwapCutHookScene";
import { SwapCutPickScene } from "./scenes/SwapCutPickScene";
import { SwapCutReseatScene } from "./scenes/SwapCutReseatScene";
import { SwapCutCtaScene } from "./scenes/SwapCutCtaScene";
import { SWAP_CUT_SCENES, SWAP_CUT_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: SWAP_CUT_TRANSITION })}
  />
);

/** The 17 s seat-swap cut: a full room, one guest typed in and moved, the one she turned out reseated, the CTA. */
export const SeatSwapCut: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SWAP_CUT_SCENES.hook}>
          <SwapCutHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={SWAP_CUT_SCENES.pick}>
          <SwapCutPickScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={SWAP_CUT_SCENES.reseat}>
          <SwapCutReseatScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={SWAP_CUT_SCENES.cta}>
          <SwapCutCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
