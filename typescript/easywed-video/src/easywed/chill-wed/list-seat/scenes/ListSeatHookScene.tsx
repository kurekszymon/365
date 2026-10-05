import React from "react";
import { useCurrentFrame } from "remotion";
import { ListSeatStage } from "../components/ListSeatStage";
import { LIST_SEAT_STARTS } from "../timeline";

/**
 * The guest list open on the couple's phone, scrolled to its end, where Tomek
 * was just written in *Bez miejsca*; the hook is up on frame 0. It makes way
 * for the question as the camera closes on his row.
 */
export const ListSeatHookScene: React.FC = () => <ListSeatStage frame={useCurrentFrame() + LIST_SEAT_STARTS.hook} />;
