import "./index.css";
import React from "react";
import { Composition, Folder } from "remotion";
import { Film } from "./easywed/Film";
import { IntroScene } from "./easywed/scenes/IntroScene";
import { HallScene } from "./easywed/scenes/HallScene";
import { GuestsScene } from "./easywed/scenes/GuestsScene";
import { SeatingScene } from "./easywed/scenes/SeatingScene";
import { OutroScene } from "./easywed/scenes/OutroScene";
import {
  FPS,
  HEIGHT,
  SCENES,
  TOTAL_DURATION,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
  WIDTH,
} from "./easywed/timeline";

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

      {/* Each scene on its own, so a single beat can be previewed in isolation. */}
      <Folder name="Scenes">
        <Composition id="Intro" component={IntroScene} durationInFrames={SCENES.intro} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Hall" component={HallScene} durationInFrames={SCENES.hall} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Guests" component={GuestsScene} durationInFrames={SCENES.guests} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Seating" component={SeatingScene} durationInFrames={SCENES.seating} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Outro" component={OutroScene} durationInFrames={SCENES.outro} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>
    </>
  );
};
