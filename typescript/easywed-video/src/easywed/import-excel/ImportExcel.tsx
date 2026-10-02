import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { ImportHookScene } from "./scenes/ImportHookScene";
import { ImportDropScene } from "./scenes/ImportDropScene";
import { ImportMapScene } from "./scenes/ImportMapScene";
import { ImportLandedScene } from "./scenes/ImportLandedScene";
import { IMPORT_EXCEL_SCENES, IMPORT_EXCEL_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: IMPORT_EXCEL_TRANSITION })}
  />
);

/** The 20 s cut: the list in Excel, the file dropped in, the columns, the seated room. */
export const ImportExcel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={IMPORT_EXCEL_SCENES.hook}>
          <ImportHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={IMPORT_EXCEL_SCENES.drop}>
          <ImportDropScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={IMPORT_EXCEL_SCENES.map}>
          <ImportMapScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={IMPORT_EXCEL_SCENES.landed}>
          <ImportLandedScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
