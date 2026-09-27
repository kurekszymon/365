import React from "react";
import { useCurrentFrame } from "remotion";
import { CouchPlanner } from "../components/CouchPlanner";
import { SUNDAY_COUCH_STARTS } from "../timeline";

/**
 * 22:30: back over the whole laptop, every chair taken and the card at its full count.
 */
export const CouchDoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <CouchPlanner frame={frame + SUNDAY_COUCH_STARTS.done} />;
};
