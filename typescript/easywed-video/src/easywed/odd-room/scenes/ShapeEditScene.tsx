import React from "react";
import { useCurrentFrame } from "remotion";
import { LOOP_SEAM, LoopSeam } from "../../components/LoopSeam";
import { ShapePlanner } from "../components/ShapePlanner";
import { SHAPE_SCENES, SHAPE_STARTS } from "../timeline";
import { ShapeHookScene } from "./ShapeHookScene";

/**
 * The notch's outer corner dragged a metre outward, then the payoff. As a page
 * loop it closes on `LoopSeam` back to the hook's frame 0; the walkthrough,
 * which carries on into its next chapter, passes `loop={false}`.
 */
export const ShapeEditScene: React.FC<{ loop?: boolean }> = ({ loop = true }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <ShapePlanner frame={frame + SHAPE_STARTS.edit} />
      {loop ? (
        <LoopSeam from={SHAPE_SCENES.edit - LOOP_SEAM}>
          <ShapeHookScene />
        </LoopSeam>
      ) : null}
    </>
  );
};
