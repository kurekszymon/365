import React from "react";
import { useCurrentFrame } from "remotion";
import { TenTablesStage } from "../components/TenTablesStage";
import { TEN_TABLES_STARTS } from "../timeline";

/**
 * The rail's *Elementy sali*, *Dodaj element*, the *Dodaj do sali* dialog and
 * *Parkiet*; then, on jump cuts, the dance floor, the stage and the entrance
 * each dragged into place. The camera pulls back over the whole room and the
 * payoff lands.
 */
export const TenTablesRoomScene: React.FC = () => <TenTablesStage frame={useCurrentFrame() + TEN_TABLES_STARTS.room} />;
