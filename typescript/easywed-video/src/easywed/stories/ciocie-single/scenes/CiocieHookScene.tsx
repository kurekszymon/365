import React from "react";
import { useCurrentFrame } from "remotion";
import { CiocieStage } from "../components/CiocieStage";
import { CIOCIE_STARTS } from "../timeline";

/**
 * The couple's phone pinched in on the top of the room, every table full and
 * every chair initialled, Stół 2 top right; the hook is up on frame 0. The
 * thumb comes in over Stół 2.
 */
export const CiocieHookScene: React.FC = () => <CiocieStage frame={useCurrentFrame() + CIOCIE_STARTS.hook} />;
