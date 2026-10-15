import React from "react";
import { Composition, Folder } from "remotion";
import { FPS, VERTICAL_HEIGHT, VERTICAL_WIDTH } from "../timeline";
import { ExtraChair } from "./extra-chair/ExtraChair";
import { EXTRA_CHAIR_DURATION } from "./extra-chair/timeline";
import { STRESS_AWAY_DURATION, StressAway } from "./stress-away/StressAway";

/** Standalone animations, each at the sizes it is posted in. */
export const AnimationsCompositions: React.FC = () => {
  return (
    <>
      <Folder name="Animations">
        <Composition
          id="easywed-stress-away-vertical"
          component={StressAway}
          durationInFrames={STRESS_AWAY_DURATION}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        {/* A full table gets two more chairs and two more guests - a 9:16 loop on LoopReel. */}
        <Composition
          id="easywed-extra-chair-vertical"
          component={ExtraChair}
          durationInFrames={EXTRA_CHAIR_DURATION}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>
    </>
  );
};
