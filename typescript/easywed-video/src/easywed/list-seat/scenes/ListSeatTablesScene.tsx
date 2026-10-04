import React from "react";
import { useCurrentFrame } from "remotion";
import { ListSeatStage } from "../components/ListSeatStage";
import { LIST_SEAT_STARTS } from "../timeline";

/**
 * His row's seat button opens the sheet on the table list: every full table
 * greyed out, Stół 5 the one left, and it is tapped.
 */
export const ListSeatTablesScene: React.FC = () => <ListSeatStage frame={useCurrentFrame() + LIST_SEAT_STARTS.tables} />;
