import React from "react";
import { Composition, Folder } from "remotion";
import { FPS, HEIGHT, WIDTH } from "../timeline";
import { ToScale } from "./to-scale/ToScale";
import { ScaleHookScene } from "./to-scale/scenes/ScaleHookScene";
import { ScaleMeasureScene } from "./to-scale/scenes/ScaleMeasureScene";
import { ScaleGapScene } from "./to-scale/scenes/ScaleGapScene";
import { SCALE_DURATION, SCALE_SCENES } from "./to-scale/timeline";
import { SeatSwap } from "./seat-swap/SeatSwap";
import { SwapHookScene } from "./seat-swap/scenes/SwapHookScene";
import { SwapPickScene } from "./seat-swap/scenes/SwapPickScene";
import { SwapReseatScene } from "./seat-swap/scenes/SwapReseatScene";
import { SWAP_DURATION, SWAP_SCENES } from "./seat-swap/timeline";
import { OddRoom } from "./odd-room/OddRoom";
import { ShapeHookScene } from "./odd-room/scenes/ShapeHookScene";
import { ShapeLScene } from "./odd-room/scenes/ShapeLScene";
import { ShapeEditScene } from "./odd-room/scenes/ShapeEditScene";
import { SHAPE_DURATION, SHAPE_SCENES } from "./odd-room/timeline";

/** The 16:9 landing-page loops with their beats. */
export const LandingLoopsCompositions: React.FC = () => {
  return (
    <>
      {/* The landing-page loops - 16:9 only, no CTA, each closing on `LoopSeam`
      back to its frame 0 - with their beats nested beside them. */}
      <Folder name="Landing-loops">
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

        {/* The 12 s odd-room loop - the rectangle turned into the L the room really is,
        one corner pulled out by hand; 16:9 only, no CTA, loops back to frame 0. */}
        <Composition
          id="easywed-shape"
          component={OddRoom}
          durationInFrames={SHAPE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />

        {/* The to-scale loop's beats, at 16:9 - the only size it is made for. */}
        <Folder name="Scale">
          <Composition
            id="ScaleHook"
            component={ScaleHookScene}
            durationInFrames={SCALE_SCENES.hook}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ScaleMeasure"
            component={ScaleMeasureScene}
            durationInFrames={SCALE_SCENES.measure}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ScaleGap"
            component={ScaleGapScene}
            durationInFrames={SCALE_SCENES.gap}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        {/* The seat-swap loop's beats, at 16:9 - the only size it is made for. */}
        <Folder name="Swap">
          <Composition
            id="SwapHook"
            component={SwapHookScene}
            durationInFrames={SWAP_SCENES.hook}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="SwapPick"
            component={SwapPickScene}
            durationInFrames={SWAP_SCENES.pick}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="SwapReseat"
            component={SwapReseatScene}
            durationInFrames={SWAP_SCENES.reseat}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        {/* The odd-room loop's beats, at 16:9 - the only size it is made for. */}
        <Folder name="Shape">
          <Composition
            id="ShapeHook"
            component={ShapeHookScene}
            durationInFrames={SHAPE_SCENES.hook}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ShapeL"
            component={ShapeLScene}
            durationInFrames={SHAPE_SCENES.lShape}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ShapeEdit"
            component={ShapeEditScene}
            durationInFrames={SHAPE_SCENES.edit}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>
      </Folder>
    </>
  );
};
