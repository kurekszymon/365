import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { TableShapeHookScene } from "./scenes/TableShapeHookScene";
import { TableShapeShapeScene } from "./scenes/TableShapeShapeScene";
import { TableShapeTurnScene } from "./scenes/TableShapeTurnScene";
import { TableShapeCtaScene } from "./scenes/TableShapeCtaScene";
import { TABLE_SHAPE_SCENES, TABLE_SHAPE_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TABLE_SHAPE_TRANSITION })}
  />
);

/** The 16 s table-shape cut: round or long - one seated table tried both ways on the plan, its guests staying put - the CTA. */
export const TableShape: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TABLE_SHAPE_SCENES.hook}>
          <TableShapeHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TABLE_SHAPE_SCENES.shape}>
          <TableShapeShapeScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TABLE_SHAPE_SCENES.turn}>
          <TableShapeTurnScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TABLE_SHAPE_SCENES.cta}>
          <TableShapeCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
