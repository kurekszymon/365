import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { ScaleHookScene } from "./scenes/ScaleHookScene";
import { ScaleMeasureScene } from "./scenes/ScaleMeasureScene";
import { ScaleGapScene } from "./scenes/ScaleGapScene";
import { SCALE_SCENES, SCALE_TRANSITION } from "./timeline";

const dissolve = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: SCALE_TRANSITION })}
  />
);

/** The 12 s landing loop: the question, a distance across, a distance up, and back to the start. */
export const ToScale: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCALE_SCENES.hook}>
          <ScaleHookScene />
        </TransitionSeries.Sequence>
        {dissolve}
        <TransitionSeries.Sequence durationInFrames={SCALE_SCENES.measure}>
          <ScaleMeasureScene />
        </TransitionSeries.Sequence>
        {dissolve}
        <TransitionSeries.Sequence durationInFrames={SCALE_SCENES.gap}>
          <ScaleGapScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
