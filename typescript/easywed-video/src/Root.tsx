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
    </>
  );
};
