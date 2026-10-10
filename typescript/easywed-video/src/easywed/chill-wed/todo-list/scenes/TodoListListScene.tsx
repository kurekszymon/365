import React from "react";
import { useCurrentFrame } from "remotion";
import { TodoListStage } from "../components/TodoListStage";
import { TODO_LIST_STARTS } from "../timeline";

/**
 * Close on the rows: the deposit, red because it is overdue; its check
 * strikes it through and greys the date. Then *Dodaj przypomnienie* is
 * tapped - the popover it opens is the next scene's.
 */
export const TodoListListScene: React.FC = () => <TodoListStage frame={useCurrentFrame() + TODO_LIST_STARTS.list} />;
