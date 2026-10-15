import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../../theme";
import { TodoListHookScene } from "./scenes/TodoListHookScene";
import { TodoListListScene } from "./scenes/TodoListListScene";
import { TodoListAddScene } from "./scenes/TodoListAddScene";
import { TodoListCtaScene } from "./scenes/TodoListCtaScene";
import { TODO_LIST_SCENES, TODO_LIST_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TODO_LIST_TRANSITION })}
  />
);

/** The 15 s todo-list cut: did we pay the DJ - the dated list beside the plan, red when overdue, ticked when done, one more added - the CTA. */
export const TodoList: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TODO_LIST_SCENES.hook}>
          <TodoListHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TODO_LIST_SCENES.list}>
          <TodoListListScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TODO_LIST_SCENES.add}>
          <TodoListAddScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={TODO_LIST_SCENES.cta}>
          <TodoListCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
