import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useFormat } from "../format";
import { tl } from "../i18n";
import { secondHallBeside } from "../layouts";
import { colors } from "../theme";
import { IntroScene } from "../scenes/IntroScene";
import { HallScene } from "../scenes/HallScene";
import { GuestsScene } from "../scenes/GuestsScene";
import { SeatingScene } from "../scenes/SeatingScene";
import { OutroScene } from "../scenes/OutroScene";
import { ShapeLScene } from "../odd-room/scenes/ShapeLScene";
import { ShapeEditScene } from "../odd-room/scenes/ShapeEditScene";
import { ImportDropScene } from "../import-excel/scenes/ImportDropScene";
import { ImportMapScene } from "../import-excel/scenes/ImportMapScene";
import { KidsTagScene } from "../kids-count/scenes/KidsTagScene";
import { KidsCountScene } from "../kids-count/scenes/KidsCountScene";
import { ScaleMeasureScene } from "../to-scale/scenes/ScaleMeasureScene";
import { SwapCutPickScene } from "../seat-swap/scenes/SwapCutPickScene";
import { SwapCutReseatScene } from "../seat-swap/scenes/SwapCutReseatScene";
import { ReportSheetScene } from "../kitchen-report/scenes/ReportSheetScene";
import { FloorsScene } from "./scenes/FloorsScene";
import {
  SWAP_RESEAT_START,
  WALKTHROUGH_LONG_SCENES,
  WALKTHROUGH_LONG_TRANSITION,
  WALKTHROUGH_LONG_VERTICAL_SKIPS,
} from "./timeline";

const S = WALKTHROUGH_LONG_SCENES;

const crossfade = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: WALKTHROUGH_LONG_TRANSITION })}
  />
);

/**
 * The 83 s tour: the question over the logo, the room sketched, a second hall
 * added upstairs and shaped to the venue, the list imported, everyone seated,
 * the children counted, a distance measured, one guest moved, the plan printed,
 * the CTA. Most chapters are other films' scenes, their own questions and
 * payoffs included; the kids chapters follow the seating, since they draw a
 * room that is already seated.
 *
 * The 9:16 cut draws the same chapters in portrait - the forms in the phone's
 * bottom sheet - less the measure chapter (`WALKTHROUGH_LONG_VERTICAL_SKIPS`).
 */
export const WalkthroughLong: React.FC = () => {
  const { tall, hall } = useFormat();
  // Where `nextHallPosition` puts the second hall: beside whichever room this format draws first.
  const second = secondHallBeside(hall);
  const measure = !(tall && WALKTHROUGH_LONG_VERTICAL_SKIPS.includes("scaleMeasure"));

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={S.intro}>
          <IntroScene hook={tl.walkthrough.hook} />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.hall}>
          <HallScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.floors}>
          <FloorsScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.shapeL}>
          <ShapeLScene hall={second} />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.shapeEdit}>
          <ShapeEditScene hall={second} loop={false} />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.importDrop}>
          <ImportDropScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.importMap}>
          <ImportMapScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.guests}>
          <GuestsScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.seating}>
          <SeatingScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.kidsTag}>
          <KidsTagScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.kidsCount}>
          <KidsCountScene />
        </TransitionSeries.Sequence>
        {crossfade}
        {measure ? (
          <TransitionSeries.Sequence durationInFrames={S.scaleMeasure}>
            <ScaleMeasureScene />
          </TransitionSeries.Sequence>
        ) : null}
        {measure ? crossfade : null}
        <TransitionSeries.Sequence durationInFrames={S.swapPick}>
          <SwapCutPickScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.swapReseat}>
          <SwapCutReseatScene start={SWAP_RESEAT_START} />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.reportSheet}>
          <ReportSheetScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={S.outro}>
          <OutroScene title={tl.walkthrough.outroTitle} features={[]} action={tl.walkthrough.outroAction} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
