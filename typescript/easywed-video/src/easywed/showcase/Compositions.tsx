import React from "react";
import { Composition, Folder } from "remotion";
import { Film } from "./demo/Film";
import { IntroScene } from "./demo/scenes/IntroScene";
import { HallScene } from "./demo/scenes/HallScene";
import { GuestsScene } from "./demo/scenes/GuestsScene";
import { SeatingScene } from "./demo/scenes/SeatingScene";
import { OutroScene } from "./demo/scenes/OutroScene";
import { Teaser } from "./teaser/Teaser";
import { HookScene } from "./teaser/scenes/HookScene";
import { ChaosScene } from "./teaser/scenes/ChaosScene";
import { PlanScene } from "./teaser/scenes/PlanScene";
import { CtaScene } from "./teaser/scenes/CtaScene";
import {
  FPS,
  HEIGHT,
  SCENES,
  TOTAL_DURATION,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
  WIDTH,
} from "../timeline";
import { TEASER_DURATION, TEASER_SCENES } from "./teaser/timeline";
import { WalkthroughLong } from "./walkthrough-long/WalkthroughLong";
import { FloorsScene } from "./walkthrough-long/scenes/FloorsScene";
import {
  WALKTHROUGH_LONG_DURATION,
  WALKTHROUGH_LONG_SCENES,
  WALKTHROUGH_LONG_VERTICAL_DURATION,
} from "./walkthrough-long/timeline";

/** The overview films - the demo, the teaser and the long walkthrough - with their beats. */
export const ShowcaseCompositions: React.FC = () => {
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

      {/* The 83 s YouTube tour - the walkthrough's scenes with a second hall, the
      other films' beats as chapters between them. */}
      <Composition
        id="easywed-walkthrough"
        component={WalkthroughLong}
        durationInFrames={WALKTHROUGH_LONG_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* The same tour in portrait, 78.5 s: the measure chapter has no phone equivalent at v1. */}
      <Composition
        id="easywed-walkthrough-vertical"
        component={WalkthroughLong}
        durationInFrames={WALKTHROUGH_LONG_VERTICAL_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* Each scene on its own, so a single beat can be previewed in isolation. */}
      <Folder name="Scenes">
        <Composition
          id="Intro"
          component={IntroScene}
          durationInFrames={SCENES.intro}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Hall"
          component={HallScene}
          durationInFrames={SCENES.hall}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Guests"
          component={GuestsScene}
          durationInFrames={SCENES.guests}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Seating"
          component={SeatingScene}
          durationInFrames={SCENES.seating}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Outro"
          component={OutroScene}
          durationInFrames={SCENES.outro}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      </Folder>

      {/* The long walkthrough's one scene of its own, at 16:9 - the cut it is made for.
      Its other chapters are registered with the films they come from. */}
      <Folder name="Walkthrough-long">
        <Composition
          id="Floors"
          component={FloorsScene}
          durationInFrames={WALKTHROUGH_LONG_SCENES.floors}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      </Folder>

      {/* The teaser's beats, registered at 9:16 - the cut it is made for, and
      the one whose stacked layouts need the most checking. */}
      <Folder name="Teaser">
        <Composition
          id="Hook"
          component={HookScene}
          durationInFrames={TEASER_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="Chaos"
          component={ChaosScene}
          durationInFrames={TEASER_SCENES.chaos}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="Plan"
          component={PlanScene}
          durationInFrames={TEASER_SCENES.plan}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="Cta"
          component={CtaScene}
          durationInFrames={TEASER_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>
    </>
  );
};
