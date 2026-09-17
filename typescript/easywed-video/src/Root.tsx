import "./index.css";
import React from "react";
import { Composition, Folder } from "remotion";
import { Film } from "./easywed/Film";
import { IntroScene } from "./easywed/scenes/IntroScene";
import { HallScene } from "./easywed/scenes/HallScene";
import { GuestsScene } from "./easywed/scenes/GuestsScene";
import { SeatingScene } from "./easywed/scenes/SeatingScene";
import { OutroScene } from "./easywed/scenes/OutroScene";
import { Teaser } from "./easywed/teaser/Teaser";
import { HookScene } from "./easywed/teaser/scenes/HookScene";
import { ChaosScene } from "./easywed/teaser/scenes/ChaosScene";
import { PlanScene } from "./easywed/teaser/scenes/PlanScene";
import { CtaScene } from "./easywed/teaser/scenes/CtaScene";
import {
  FPS,
  HEIGHT,
  SCENES,
  TOTAL_DURATION,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
  WIDTH,
} from "./easywed/timeline";
import { TEASER_DURATION, TEASER_SCENES } from "./easywed/teaser/timeline";
import { ImportExcel } from "./easywed/import-excel/ImportExcel";
import { ImportHookScene } from "./easywed/import-excel/scenes/ImportHookScene";
import { ImportDropScene } from "./easywed/import-excel/scenes/ImportDropScene";
import { ImportMapScene } from "./easywed/import-excel/scenes/ImportMapScene";
import { ImportLandedScene } from "./easywed/import-excel/scenes/ImportLandedScene";
import { IMPORT_EXCEL_DURATION, IMPORT_EXCEL_SCENES } from "./easywed/import-excel/timeline";
import { KitchenReport } from "./easywed/kitchen-report/KitchenReport";
import { ReportHookScene } from "./easywed/kitchen-report/scenes/ReportHookScene";
import { ReportTagsScene } from "./easywed/kitchen-report/scenes/ReportTagsScene";
import { ReportSheetScene } from "./easywed/kitchen-report/scenes/ReportSheetScene";
import { ReportCtaScene } from "./easywed/kitchen-report/scenes/ReportCtaScene";
import { KITCHEN_REPORT_DURATION, KITCHEN_REPORT_SCENES } from "./easywed/kitchen-report/timeline";
import { ToScale } from "./easywed/to-scale/ToScale";
import { ScaleHookScene } from "./easywed/to-scale/scenes/ScaleHookScene";
import { ScaleMeasureScene } from "./easywed/to-scale/scenes/ScaleMeasureScene";
import { ScaleGapScene } from "./easywed/to-scale/scenes/ScaleGapScene";
import { SCALE_DURATION, SCALE_SCENES } from "./easywed/to-scale/timeline";
import { SeatSwap } from "./easywed/seat-swap/SeatSwap";
import { SwapHookScene } from "./easywed/seat-swap/scenes/SwapHookScene";
import { SwapPickScene } from "./easywed/seat-swap/scenes/SwapPickScene";
import { SwapReseatScene } from "./easywed/seat-swap/scenes/SwapReseatScene";
import { SWAP_DURATION, SWAP_SCENES } from "./easywed/seat-swap/timeline";
import { KidsCount } from "./easywed/kids-count/KidsCount";
import { KidsHookScene } from "./easywed/kids-count/scenes/KidsHookScene";
import { KidsTagScene } from "./easywed/kids-count/scenes/KidsTagScene";
import { KidsCountScene } from "./easywed/kids-count/scenes/KidsCountScene";
import { KidsCtaScene } from "./easywed/kids-count/scenes/KidsCtaScene";
import { KIDS_DURATION, KIDS_SCENES } from "./easywed/kids-count/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Composition ids are the brand as it is written everywhere else -
          lowercase, never "Easywed" - and ids can't hold the trailing dot. */}
      <Composition
        id="easywed-demo"
        component={Film}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Same scenes; they switch to the portrait hall and mobile chrome on their own. */}
      <Composition
        id="easywed-demo-vertical"
        component={Film}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 15 s social cut - same palette and components, its own beats. */}
      <Composition
        id="easywed-teaser"
        component={Teaser}
        durationInFrames={TEASER_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-teaser-vertical"
        component={Teaser}
        durationInFrames={TEASER_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 20 s import cut - the guest list already in Excel, read in and seated. */}
      <Composition
        id="easywed-import"
        component={ImportExcel}
        durationInFrames={IMPORT_EXCEL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-import-vertical"
        component={ImportExcel}
        durationInFrames={IMPORT_EXCEL_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 18 s kitchen-report cut - the diets on the list, printed for the venue, florist and kitchen. */}
      <Composition
        id="easywed-report"
        component={KitchenReport}
        durationInFrames={KITCHEN_REPORT_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-report-vertical"
        component={KitchenReport}
        durationInFrames={KITCHEN_REPORT_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 17 s kids cut - two age brackets typed onto the guest list, and the count that follows. */}
      <Composition
        id="easywed-kids"
        component={KidsCount}
        durationInFrames={KIDS_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-kids-vertical"
        component={KidsCount}
        durationInFrames={KIDS_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 12 s landing-page loop - two distances measured in metres; 16:9 only, no CTA, loops back to frame 0. */}
      <Composition
        id="easywed-scale"
        component={ToScale}
        durationInFrames={SCALE_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* The 13 s seat-swap loop - one guest moved onto a taken chair, the one she
          turned out given hers; 16:9 only, no CTA, loops back to frame 0. */}
      <Composition
        id="easywed-swap"
        component={SeatSwap}
        durationInFrames={SWAP_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Each scene on its own, so a single beat can be previewed in isolation. */}
      <Folder name="Scenes">
        <Composition id="Intro" component={IntroScene} durationInFrames={SCENES.intro} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Hall" component={HallScene} durationInFrames={SCENES.hall} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Guests" component={GuestsScene} durationInFrames={SCENES.guests} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Seating" component={SeatingScene} durationInFrames={SCENES.seating} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Outro" component={OutroScene} durationInFrames={SCENES.outro} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>

      {/* The teaser's beats, registered at 9:16 - the cut it is made for, and
          the one whose stacked layouts need the most checking. */}
      <Folder name="Teaser">
        <Composition id="Hook" component={HookScene} durationInFrames={TEASER_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="Chaos" component={ChaosScene} durationInFrames={TEASER_SCENES.chaos} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="Plan" component={PlanScene} durationInFrames={TEASER_SCENES.plan} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="Cta" component={CtaScene} durationInFrames={TEASER_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The import cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Import">
        <Composition id="ImportHook" component={ImportHookScene} durationInFrames={IMPORT_EXCEL_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ImportDrop" component={ImportDropScene} durationInFrames={IMPORT_EXCEL_SCENES.drop} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ImportMap" component={ImportMapScene} durationInFrames={IMPORT_EXCEL_SCENES.map} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ImportLanded" component={ImportLandedScene} durationInFrames={IMPORT_EXCEL_SCENES.landed} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The kitchen-report cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Report">
        <Composition id="ReportHook" component={ReportHookScene} durationInFrames={KITCHEN_REPORT_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ReportTags" component={ReportTagsScene} durationInFrames={KITCHEN_REPORT_SCENES.tags} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ReportSheet" component={ReportSheetScene} durationInFrames={KITCHEN_REPORT_SCENES.sheet} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ReportCta" component={ReportCtaScene} durationInFrames={KITCHEN_REPORT_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The kids cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Kids">
        <Composition id="KidsHook" component={KidsHookScene} durationInFrames={KIDS_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="KidsTag" component={KidsTagScene} durationInFrames={KIDS_SCENES.tag} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="KidsCount" component={KidsCountScene} durationInFrames={KIDS_SCENES.count} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="KidsCta" component={KidsCtaScene} durationInFrames={KIDS_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The to-scale loop's beats, at 16:9 - the only size it is made for. */}
      <Folder name="Scale">
        <Composition id="ScaleHook" component={ScaleHookScene} durationInFrames={SCALE_SCENES.hook} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="ScaleMeasure" component={ScaleMeasureScene} durationInFrames={SCALE_SCENES.measure} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="ScaleGap" component={ScaleGapScene} durationInFrames={SCALE_SCENES.gap} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>

      {/* The seat-swap loop's beats, at 16:9 - the only size it is made for. */}
      <Folder name="Swap">
        <Composition id="SwapHook" component={SwapHookScene} durationInFrames={SWAP_SCENES.hook} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="SwapPick" component={SwapPickScene} durationInFrames={SWAP_SCENES.pick} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="SwapReseat" component={SwapReseatScene} durationInFrames={SWAP_SCENES.reseat} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>
    </>
  );
};
