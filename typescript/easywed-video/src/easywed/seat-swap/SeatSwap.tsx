import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { SwapHookScene } from "./scenes/SwapHookScene";
import { SwapPickScene } from "./scenes/SwapPickScene";
import { SwapReseatScene } from "./scenes/SwapReseatScene";
import { SWAP_SCENES, SWAP_TRANSITION } from "./timeline";

const dissolve = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: SWAP_TRANSITION })}
  />
);

/** The 13 s landing loop: a full room, one guest moved in, the one she moved out reseated. */
export const SeatSwap: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SWAP_SCENES.hook}>
          <SwapHookScene />
        </TransitionSeries.Sequence>
        {dissolve}
        <TransitionSeries.Sequence durationInFrames={SWAP_SCENES.pick}>
          <SwapPickScene />
        </TransitionSeries.Sequence>
        {dissolve}
        <TransitionSeries.Sequence durationInFrames={SWAP_SCENES.reseat}>
          <SwapReseatScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
