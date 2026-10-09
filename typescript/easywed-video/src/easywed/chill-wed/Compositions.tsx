import React from "react";
import { Composition, Folder } from "remotion";
import {
  FPS,
  CAROUSEL_HEIGHT,
  CAROUSEL_WIDTH,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
} from "../timeline";
import { ListSeat } from "./list-seat/ListSeat";
import { ListSeatHookScene } from "./list-seat/scenes/ListSeatHookScene";
import { ListSeatTablesScene } from "./list-seat/scenes/ListSeatTablesScene";
import { ListSeatSeatScene } from "./list-seat/scenes/ListSeatSeatScene";
import { ListSeatCtaScene } from "./list-seat/scenes/ListSeatCtaScene";
import { LIST_SEAT_DURATION, LIST_SEAT_SCENES } from "./list-seat/timeline";
import { TableShape } from "./table-shape/TableShape";
import { TableShapeHookScene } from "./table-shape/scenes/TableShapeHookScene";
import { TableShapeShapeScene } from "./table-shape/scenes/TableShapeShapeScene";
import { TableShapeTurnScene } from "./table-shape/scenes/TableShapeTurnScene";
import { TableShapeCtaScene } from "./table-shape/scenes/TableShapeCtaScene";
import {
  TABLE_SHAPE_DURATION,
  TABLE_SHAPE_SCENES,
} from "./table-shape/timeline";
import { TenTables } from "./ten-tables/TenTables";
import { TenTablesHookScene } from "./ten-tables/scenes/TenTablesHookScene";
import { TenTablesBatchScene } from "./ten-tables/scenes/TenTablesBatchScene";
import { TenTablesRoomScene } from "./ten-tables/scenes/TenTablesRoomScene";
import { TenTablesCtaScene } from "./ten-tables/scenes/TenTablesCtaScene";
import { TEN_TABLES_DURATION, TEN_TABLES_SCENES } from "./ten-tables/timeline";
import { TryNow } from "./try-now/TryNow";
import { TryNowHookScene } from "./try-now/scenes/TryNowHookScene";
import { TryNowTableScene } from "./try-now/scenes/TryNowTableScene";
import { TryNowSeatScene } from "./try-now/scenes/TryNowSeatScene";
import { TryNowCtaScene } from "./try-now/scenes/TryNowCtaScene";
import { TRY_NOW_DURATION, TRY_NOW_SCENES } from "./try-now/timeline";
import { TodoList } from "./todo-list/TodoList";
import { TodoListHookScene } from "./todo-list/scenes/TodoListHookScene";
import { TodoListListScene } from "./todo-list/scenes/TodoListListScene";
import { TodoListAddScene } from "./todo-list/scenes/TodoListAddScene";
import { TodoListCtaScene } from "./todo-list/scenes/TodoListCtaScene";
import { TODO_LIST_DURATION, TODO_LIST_SCENES } from "./todo-list/timeline";
import { CarouselEpisode } from "./carousel/CarouselEpisode";

/** The „Wesele bez spiny” Instagram series - its episodes, the carousel and each episode's beats. */
export const ChillWedCompositions: React.FC = () => {
  return (
    <>
      {/* The 16 s list-seat cut, episode 1 of the Instagram series - the cousin who is
      coming after all, seated from the guest list on a phone; 9:16 for now, the
      1:1 feed cut waits on the square format. */}
      <Composition
        id="easywed-listseat-vertical"
        component={ListSeat}
        durationInFrames={LIST_SEAT_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 16 s table-shape cut, episode 2 of the Instagram series - one seated
      table tried round, square, long and turned along the wall on the
      couple's phone, its guests staying put; 9:16 only. */}
      <Composition
        id="easywed-tableshape-vertical"
        component={TableShape}
        durationInFrames={TABLE_SHAPE_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 18 s ten-tables cut, episode 3 of the Instagram series - the venue's
      ten round tables typed once into the batch form on the couple's laptop,
      then the dance floor, stage and door dragged into place; 9:16 only. */}
      <Composition
        id="easywed-batch-vertical"
        component={TenTables}
        durationInFrames={TEN_TABLES_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 25.5 s try-now speedrun, episode 4 of the Instagram series - a stopwatch
      from easywed.app's landing page, through guest mode, to the first guest
      seated at the first table, with no cut in the run; 9:16 only. */}
      <Composition
        id="easywed-trynow-vertical"
        component={TryNow}
        durationInFrames={TRY_NOW_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 15 s todo-list cut, episode 5 of the Instagram series - the DJ deposit
      found red on the couple's dated list, ticked off, one more added; 9:16 only. */}
      <Composition
        id="easywed-todo-vertical"
        component={TodoList}
        durationInFrames={TODO_LIST_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The series' IG carousel: each episode's finished 9:16 render, scaled
      into a 4:5 slide - the tallest a carousel shows uncropped. */}
      <Folder name="Carousel">
        <Composition
          id="easywed-carousel-listseat"
          component={CarouselEpisode}
          durationInFrames={LIST_SEAT_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_HEIGHT}
          defaultProps={{ file: "easywed-listseat-vertical.mp4" }}
        />
        <Composition
          id="easywed-carousel-tableshape"
          component={CarouselEpisode}
          durationInFrames={TABLE_SHAPE_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_HEIGHT}
          defaultProps={{ file: "easywed-tableshape-vertical.mp4" }}
        />
        <Composition
          id="easywed-carousel-batch"
          component={CarouselEpisode}
          durationInFrames={TEN_TABLES_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_HEIGHT}
          defaultProps={{ file: "easywed-batch-vertical.mp4" }}
        />
        <Composition
          id="easywed-carousel-todo"
          component={CarouselEpisode}
          durationInFrames={TODO_LIST_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_HEIGHT}
          defaultProps={{ file: "easywed-todo-vertical.mp4" }}
        />
      </Folder>

      {/* The todo-list cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Todo-list">
        <Composition
          id="TodoHook"
          component={TodoListHookScene}
          durationInFrames={TODO_LIST_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TodoRows"
          component={TodoListListScene}
          durationInFrames={TODO_LIST_SCENES.list}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TodoAdd"
          component={TodoListAddScene}
          durationInFrames={TODO_LIST_SCENES.add}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TodoCta"
          component={TodoListCtaScene}
          durationInFrames={TODO_LIST_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The list-seat cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="List-seat">
        <Composition
          id="ListSeatHook"
          component={ListSeatHookScene}
          durationInFrames={LIST_SEAT_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ListSeatTables"
          component={ListSeatTablesScene}
          durationInFrames={LIST_SEAT_SCENES.tables}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ListSeatSeat"
          component={ListSeatSeatScene}
          durationInFrames={LIST_SEAT_SCENES.seat}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ListSeatCta"
          component={ListSeatCtaScene}
          durationInFrames={LIST_SEAT_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The table-shape cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Table-shape">
        <Composition
          id="TableShapeHook"
          component={TableShapeHookScene}
          durationInFrames={TABLE_SHAPE_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TableShapeShape"
          component={TableShapeShapeScene}
          durationInFrames={TABLE_SHAPE_SCENES.shape}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TableShapeTurn"
          component={TableShapeTurnScene}
          durationInFrames={TABLE_SHAPE_SCENES.turn}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TableShapeCta"
          component={TableShapeCtaScene}
          durationInFrames={TABLE_SHAPE_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The ten-tables cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Ten-tables">
        <Composition
          id="TenTablesHook"
          component={TenTablesHookScene}
          durationInFrames={TEN_TABLES_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TenTablesBatch"
          component={TenTablesBatchScene}
          durationInFrames={TEN_TABLES_SCENES.batch}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TenTablesRoom"
          component={TenTablesRoomScene}
          durationInFrames={TEN_TABLES_SCENES.room}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TenTablesCta"
          component={TenTablesCtaScene}
          durationInFrames={TEN_TABLES_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The try-now speedrun's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Try-now">
        <Composition
          id="TryNowHook"
          component={TryNowHookScene}
          durationInFrames={TRY_NOW_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TryNowTable"
          component={TryNowTableScene}
          durationInFrames={TRY_NOW_SCENES.table}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TryNowSeat"
          component={TryNowSeatScene}
          durationInFrames={TRY_NOW_SCENES.seat}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="TryNowCta"
          component={TryNowCtaScene}
          durationInFrames={TRY_NOW_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>
    </>
  );
};
