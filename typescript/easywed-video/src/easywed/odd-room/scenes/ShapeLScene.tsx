import React from "react";
import { useCurrentFrame } from "remotion";
import type { HallLayout } from "../../layouts";
import { ShapePlanner } from "../components/ShapePlanner";
import { SHAPE_STARTS } from "../timeline";

/**
 * *Kształt L*: the top-right quarter goes from the room behind the dialog, the
 * hint and *Edytuj obrys* join the form, and pressing it hands the canvas to
 * the shape editor - the L in full, its vertex handles up. The walkthrough
 * passes its own `hall`.
 */
export const ShapeLScene: React.FC<{ hall?: HallLayout }> = ({ hall }) => {
  const frame = useCurrentFrame();
  return <ShapePlanner frame={frame + SHAPE_STARTS.lShape} hall={hall} />;
};
