import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../../theme";
import { TenTablesHookScene } from "./scenes/TenTablesHookScene";
import { TenTablesBatchScene } from "./scenes/TenTablesBatchScene";
import { TenTablesRoomScene } from "./scenes/TenTablesRoomScene";
import { TenTablesCtaScene } from "./scenes/TenTablesCtaScene";
import { TEN_TABLES_SCENES, TEN_TABLES_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TEN_TABLES_TRANSITION })}
  />
);

/** The 18 s ten-tables cut: the venue's "ten round tables of eight" typed once into the batch form, then the dance floor, stage and door dragged into place - the CTA. */
export const TenTables: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TEN_TABLES_SCENES.hook}>
          <TenTablesHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TEN_TABLES_SCENES.batch}>
          <TenTablesBatchScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TEN_TABLES_SCENES.room}>
          <TenTablesRoomScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TEN_TABLES_SCENES.cta}>
          <TenTablesCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
