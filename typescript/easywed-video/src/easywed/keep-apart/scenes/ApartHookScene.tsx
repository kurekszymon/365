import React from "react";
import { useCurrentFrame } from "remotion";
import { ApartPlanner } from "../components/ApartPlanner";
import { KEEP_APART_STARTS } from "../timeline";

/**
 * Close on the DJ booth and Stół 6 right under it, every chair taken and
 * initialled, the uncle's line already up on the first frame. The pointer
 * comes in and takes Stół 6.
 */
export const ApartHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <ApartPlanner frame={frame + KEEP_APART_STARTS.hook} />;
};
