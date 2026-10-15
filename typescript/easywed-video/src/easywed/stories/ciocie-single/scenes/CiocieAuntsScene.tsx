import React from "react";
import { useCurrentFrame } from "remotion";
import { CiocieStage } from "../components/CiocieStage";
import { CIOCIE_STARTS } from "../timeline";

/**
 * A jump cut onto Stół 5, bottom left, already selected: the pen, the drawer,
 * *Ciocie* typed, the check. Then two fingers pinch out over the whole room,
 * *Single* and *Ciocie* at opposite corners with the dance floor between, and
 * the payoff lands.
 */
export const CiocieAuntsScene: React.FC = () => <CiocieStage frame={useCurrentFrame() + CIOCIE_STARTS.ciocie} />;
