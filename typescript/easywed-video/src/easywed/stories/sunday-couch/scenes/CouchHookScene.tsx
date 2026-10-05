import React from "react";
import { useCurrentFrame } from "remotion";
import { CouchPlanner } from "../components/CouchPlanner";
import { SUNDAY_COUCH_STARTS } from "../timeline";

/**
 * Sunday, 19:40: the laptop open on the hall guest mode starts with, empty,
 * and the evening's first line already up on frame 0. The other voice answers.
 */
export const CouchHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <CouchPlanner frame={frame + SUNDAY_COUCH_STARTS.hook} />;
};
