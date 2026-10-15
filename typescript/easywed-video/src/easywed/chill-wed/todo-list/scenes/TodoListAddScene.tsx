import React from "react";
import { useCurrentFrame } from "remotion";
import { TodoListStage } from "../components/TodoListStage";
import { TODO_LIST_STARTS } from "../timeline";

/**
 * A jump cut onto *Nowe przypomnienie* already filled in - the text typed,
 * the day and hour picked - so its empty fields are never on screen. Its
 * button adds the fifth row; the camera steps back over all five for the
 * payoff.
 */
export const TodoListAddScene: React.FC = () => <TodoListStage frame={useCurrentFrame() + TODO_LIST_STARTS.add} jumped />;
