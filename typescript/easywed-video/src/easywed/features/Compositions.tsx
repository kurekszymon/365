import React from "react";
import { Composition, Folder } from "remotion";
import {
  FPS,
  HEIGHT,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
  WIDTH,
} from "../timeline";
import { ImportExcel } from "./import-excel/ImportExcel";
import { ImportHookScene } from "./import-excel/scenes/ImportHookScene";
import { ImportDropScene } from "./import-excel/scenes/ImportDropScene";
import { ImportMapScene } from "./import-excel/scenes/ImportMapScene";
import { ImportLandedScene } from "./import-excel/scenes/ImportLandedScene";
import {
  IMPORT_EXCEL_DURATION,
  IMPORT_EXCEL_SCENES,
} from "./import-excel/timeline";
import { KitchenReport } from "./kitchen-report/KitchenReport";
import { ReportHookScene } from "./kitchen-report/scenes/ReportHookScene";
import { ReportTagsScene } from "./kitchen-report/scenes/ReportTagsScene";
import { ReportSheetScene } from "./kitchen-report/scenes/ReportSheetScene";
import { ReportCtaScene } from "./kitchen-report/scenes/ReportCtaScene";
import {
  KITCHEN_REPORT_DURATION,
  KITCHEN_REPORT_SCENES,
} from "./kitchen-report/timeline";
import { SeatSwapCut } from "../landing-loops/seat-swap/SeatSwapCut";
import { SwapCutHookScene } from "../landing-loops/seat-swap/scenes/SwapCutHookScene";
import { SwapCutPickScene } from "../landing-loops/seat-swap/scenes/SwapCutPickScene";
import { SwapCutReseatScene } from "../landing-loops/seat-swap/scenes/SwapCutReseatScene";
import { SwapCutCtaScene } from "../landing-loops/seat-swap/scenes/SwapCutCtaScene";
import {
  SWAP_CUT_DURATION,
  SWAP_CUT_SCENES,
} from "../landing-loops/seat-swap/timeline";
import { KidsCount } from "./kids-count/KidsCount";
import { KidsHookScene } from "./kids-count/scenes/KidsHookScene";
import { KidsTagScene } from "./kids-count/scenes/KidsTagScene";
import { KidsCountScene } from "./kids-count/scenes/KidsCountScene";
import { KidsCtaScene } from "./kids-count/scenes/KidsCtaScene";
import { KIDS_DURATION, KIDS_SCENES } from "./kids-count/timeline";

/** The single-feature cuts - import, kitchen report, kids, seat swap - with their beats. */
export const FeaturesCompositions: React.FC = () => {
  return (
    <>
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

      {/* The 17 s seat-swap cut - the same move as the loop, the names typed into the
      popover's search, closing on the CTA. */}
      <Composition
        id="easywed-swap-cut"
        component={SeatSwapCut}
        durationInFrames={SWAP_CUT_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-swap-cut-vertical"
        component={SeatSwapCut}
        durationInFrames={SWAP_CUT_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The import cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Import">
        <Composition
          id="ImportHook"
          component={ImportHookScene}
          durationInFrames={IMPORT_EXCEL_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ImportDrop"
          component={ImportDropScene}
          durationInFrames={IMPORT_EXCEL_SCENES.drop}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ImportMap"
          component={ImportMapScene}
          durationInFrames={IMPORT_EXCEL_SCENES.map}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ImportLanded"
          component={ImportLandedScene}
          durationInFrames={IMPORT_EXCEL_SCENES.landed}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The kitchen-report cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Report">
        <Composition
          id="ReportHook"
          component={ReportHookScene}
          durationInFrames={KITCHEN_REPORT_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ReportTags"
          component={ReportTagsScene}
          durationInFrames={KITCHEN_REPORT_SCENES.tags}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ReportSheet"
          component={ReportSheetScene}
          durationInFrames={KITCHEN_REPORT_SCENES.sheet}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ReportCta"
          component={ReportCtaScene}
          durationInFrames={KITCHEN_REPORT_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The kids cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Kids">
        <Composition
          id="KidsHook"
          component={KidsHookScene}
          durationInFrames={KIDS_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="KidsTag"
          component={KidsTagScene}
          durationInFrames={KIDS_SCENES.tag}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="KidsCount"
          component={KidsCountScene}
          durationInFrames={KIDS_SCENES.count}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="KidsCta"
          component={KidsCtaScene}
          durationInFrames={KIDS_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The seat-swap cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Swap-cut">
        <Composition
          id="SwapCutHook"
          component={SwapCutHookScene}
          durationInFrames={SWAP_CUT_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="SwapCutPick"
          component={SwapCutPickScene}
          durationInFrames={SWAP_CUT_SCENES.pick}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="SwapCutReseat"
          component={SwapCutReseatScene}
          durationInFrames={SWAP_CUT_SCENES.reseat}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="SwapCutCta"
          component={SwapCutCtaScene}
          durationInFrames={SWAP_CUT_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>
    </>
  );
};
