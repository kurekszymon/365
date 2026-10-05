import React from "react";
import { Composition, Folder } from "remotion";
import {
  FPS,
  CAROUSEL_HEIGHT,
  CAROUSEL_WIDTH,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
} from "../timeline";
import { STRESS_AWAY_DURATION, StressAway } from "./stress-away/StressAway";

/** Standalone animations, each at the sizes it is posted in. */
export const AnimationsCompositions: React.FC = () => {
  return (
    <>
      <Folder name="Animations">
        <Composition
          id="easywed-stress-away"
          component={StressAway}
          durationInFrames={STRESS_AWAY_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_HEIGHT}
        />
        <Composition
          id="easywed-stress-away-square"
          component={StressAway}
          durationInFrames={STRESS_AWAY_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_WIDTH}
        />
        <Composition
          id="easywed-stress-away-vertical"
          component={StressAway}
          durationInFrames={STRESS_AWAY_DURATION}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>
    </>
  );
};
