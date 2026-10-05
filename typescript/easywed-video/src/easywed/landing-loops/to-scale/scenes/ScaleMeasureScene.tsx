import React from "react";
import { useCurrentFrame } from "remotion";
import { ScalePlanner } from "../components/ScalePlanner";
import { SCALE_STARTS } from "../timeline";

/** Stół 1's right edge across to the dance floor: the status pill walks through both hints, the label reads. */
export const ScaleMeasureScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <ScalePlanner frame={frame + SCALE_STARTS.measure} />;
};
