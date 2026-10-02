import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { ShapeHookScene } from "./scenes/ShapeHookScene";
import { ShapeLScene } from "./scenes/ShapeLScene";
import { ShapeEditScene } from "./scenes/ShapeEditScene";
import { SHAPE_SCENES, SHAPE_TRANSITION } from "./timeline";

const dissolve = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: SHAPE_TRANSITION })}
  />
);

/** The 12 s landing loop: the question, the room turned into an L, one wall pulled out, and back to the start. */
export const OddRoom: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SHAPE_SCENES.hook}>
          <ShapeHookScene />
        </TransitionSeries.Sequence>
        {dissolve}
        <TransitionSeries.Sequence durationInFrames={SHAPE_SCENES.lShape}>
          <ShapeLScene />
        </TransitionSeries.Sequence>
        {dissolve}
        <TransitionSeries.Sequence durationInFrames={SHAPE_SCENES.edit}>
          <ShapeEditScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
