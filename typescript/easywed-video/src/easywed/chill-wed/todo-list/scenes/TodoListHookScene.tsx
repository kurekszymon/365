import React from "react";
import { useCurrentFrame } from "remotion";
import { TodoListStage } from "../components/TodoListStage";
import { TODO_LIST_STARTS } from "../timeline";

/**
 * The couple's phone on the planner, the room fitted to the screen; the hook
 * is up on frame 0. The thumb taps *Przypomnienia* and its drawer rises on the
 * four reminders, the deposit's date red.
 */
export const TodoListHookScene: React.FC = () => <TodoListStage frame={useCurrentFrame() + TODO_LIST_STARTS.hook} />;
