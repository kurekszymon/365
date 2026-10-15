import React from "react";
import { useCurrentFrame } from "remotion";
import { ListSeatStage } from "../components/ListSeatStage";
import { LIST_SEAT_STARTS } from "../timeline";

/**
 * Stół 5's seats, close enough to read who holds each: the free chair between
 * his uncle and his cousin is picked and confirmed, the sheet drops onto his
 * row, now at Stół 5, and the payoff lands.
 */
export const ListSeatSeatScene: React.FC = () => <ListSeatStage frame={useCurrentFrame() + LIST_SEAT_STARTS.seat} />;
