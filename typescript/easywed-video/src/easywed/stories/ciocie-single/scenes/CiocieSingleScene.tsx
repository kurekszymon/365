import React from "react";
import { useCurrentFrame } from "remotion";
import { CiocieStage } from "../components/CiocieStage";
import { CIOCIE_STARTS } from "../timeline";

/**
 * Stół 2 tapped, its toolbar's pen opens *Edytuj stół*; *Nazwa* cleared and
 * *Single* typed. The check drops the drawer onto the plan, the table's label
 * reading *Single*.
 */
export const CiocieSingleScene: React.FC = () => <CiocieStage frame={useCurrentFrame() + CIOCIE_STARTS.single} />;
