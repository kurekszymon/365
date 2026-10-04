import "./index.css";
import React from "react";
import { Composition, Folder } from "remotion";
import { Film } from "./easywed/Film";
import { IntroScene } from "./easywed/scenes/IntroScene";
import { HallScene } from "./easywed/scenes/HallScene";
import { GuestsScene } from "./easywed/scenes/GuestsScene";
import { SeatingScene } from "./easywed/scenes/SeatingScene";
import { OutroScene } from "./easywed/scenes/OutroScene";
import { Teaser } from "./easywed/teaser/Teaser";
import { HookScene } from "./easywed/teaser/scenes/HookScene";
import { ChaosScene } from "./easywed/teaser/scenes/ChaosScene";
import { PlanScene } from "./easywed/teaser/scenes/PlanScene";
import { CtaScene } from "./easywed/teaser/scenes/CtaScene";
import {
  FPS,
  HEIGHT,
  SCENES,
  TOTAL_DURATION,
  CAROUSEL_HEIGHT,
  CAROUSEL_WIDTH,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
  WIDTH,
} from "./easywed/timeline";
import { TEASER_DURATION, TEASER_SCENES } from "./easywed/teaser/timeline";
import { ImportExcel } from "./easywed/import-excel/ImportExcel";
import { ImportHookScene } from "./easywed/import-excel/scenes/ImportHookScene";
import { ImportDropScene } from "./easywed/import-excel/scenes/ImportDropScene";
import { ImportMapScene } from "./easywed/import-excel/scenes/ImportMapScene";
import { ImportLandedScene } from "./easywed/import-excel/scenes/ImportLandedScene";
import { IMPORT_EXCEL_DURATION, IMPORT_EXCEL_SCENES } from "./easywed/import-excel/timeline";
import { KitchenReport } from "./easywed/kitchen-report/KitchenReport";
import { ReportHookScene } from "./easywed/kitchen-report/scenes/ReportHookScene";
import { ReportTagsScene } from "./easywed/kitchen-report/scenes/ReportTagsScene";
import { ReportSheetScene } from "./easywed/kitchen-report/scenes/ReportSheetScene";
import { ReportCtaScene } from "./easywed/kitchen-report/scenes/ReportCtaScene";
import { KITCHEN_REPORT_DURATION, KITCHEN_REPORT_SCENES } from "./easywed/kitchen-report/timeline";
import { ToScale } from "./easywed/to-scale/ToScale";
import { ScaleHookScene } from "./easywed/to-scale/scenes/ScaleHookScene";
import { ScaleMeasureScene } from "./easywed/to-scale/scenes/ScaleMeasureScene";
import { ScaleGapScene } from "./easywed/to-scale/scenes/ScaleGapScene";
import { SCALE_DURATION, SCALE_SCENES } from "./easywed/to-scale/timeline";
import { SeatSwap } from "./easywed/seat-swap/SeatSwap";
import { SwapHookScene } from "./easywed/seat-swap/scenes/SwapHookScene";
import { SwapPickScene } from "./easywed/seat-swap/scenes/SwapPickScene";
import { SwapReseatScene } from "./easywed/seat-swap/scenes/SwapReseatScene";
import { SWAP_DURATION, SWAP_SCENES } from "./easywed/seat-swap/timeline";
import { SeatSwapCut } from "./easywed/seat-swap/SeatSwapCut";
import { SwapCutHookScene } from "./easywed/seat-swap/scenes/SwapCutHookScene";
import { SwapCutPickScene } from "./easywed/seat-swap/scenes/SwapCutPickScene";
import { SwapCutReseatScene } from "./easywed/seat-swap/scenes/SwapCutReseatScene";
import { SwapCutCtaScene } from "./easywed/seat-swap/scenes/SwapCutCtaScene";
import { SWAP_CUT_DURATION, SWAP_CUT_SCENES } from "./easywed/seat-swap/timeline";
import { KidsCount } from "./easywed/kids-count/KidsCount";
import { KidsHookScene } from "./easywed/kids-count/scenes/KidsHookScene";
import { KidsTagScene } from "./easywed/kids-count/scenes/KidsTagScene";
import { KidsCountScene } from "./easywed/kids-count/scenes/KidsCountScene";
import { KidsCtaScene } from "./easywed/kids-count/scenes/KidsCtaScene";
import { KIDS_DURATION, KIDS_SCENES } from "./easywed/kids-count/timeline";
import { OddRoom } from "./easywed/odd-room/OddRoom";
import { ShapeHookScene } from "./easywed/odd-room/scenes/ShapeHookScene";
import { ShapeLScene } from "./easywed/odd-room/scenes/ShapeLScene";
import { ShapeEditScene } from "./easywed/odd-room/scenes/ShapeEditScene";
import { SHAPE_DURATION, SHAPE_SCENES } from "./easywed/odd-room/timeline";
import { KeepApart } from "./easywed/keep-apart/KeepApart";
import { ApartHookScene } from "./easywed/keep-apart/scenes/ApartHookScene";
import { ApartParentsScene } from "./easywed/keep-apart/scenes/ApartParentsScene";
import { ApartUncleScene } from "./easywed/keep-apart/scenes/ApartUncleScene";
import { ApartCtaScene } from "./easywed/keep-apart/scenes/ApartCtaScene";
import { KEEP_APART_DURATION, KEEP_APART_SCENES } from "./easywed/keep-apart/timeline";
import { MamaLink } from "./easywed/mama-link/MamaLink";
import { MamaHookScene } from "./easywed/mama-link/scenes/MamaHookScene";
import { MamaInviteScene } from "./easywed/mama-link/scenes/MamaInviteScene";
import { MamaPhoneScene } from "./easywed/mama-link/scenes/MamaPhoneScene";
import { MamaCtaScene } from "./easywed/mama-link/scenes/MamaCtaScene";
import { MAMA_DURATION, MAMA_SCENES } from "./easywed/mama-link/timeline";
import { SundayCouch } from "./easywed/sunday-couch/SundayCouch";
import { CouchHookScene } from "./easywed/sunday-couch/scenes/CouchHookScene";
import { CouchHallScene } from "./easywed/sunday-couch/scenes/CouchHallScene";
import { CouchSeatingScene } from "./easywed/sunday-couch/scenes/CouchSeatingScene";
import { CouchDoneScene } from "./easywed/sunday-couch/scenes/CouchDoneScene";
import { CouchCtaScene } from "./easywed/sunday-couch/scenes/CouchCtaScene";
import { SUNDAY_COUCH_DURATION, SUNDAY_COUCH_SCENES } from "./easywed/sunday-couch/timeline";
import { ListSeat } from "./easywed/list-seat/ListSeat";
import { ListSeatHookScene } from "./easywed/list-seat/scenes/ListSeatHookScene";
import { ListSeatTablesScene } from "./easywed/list-seat/scenes/ListSeatTablesScene";
import { ListSeatSeatScene } from "./easywed/list-seat/scenes/ListSeatSeatScene";
import { ListSeatCtaScene } from "./easywed/list-seat/scenes/ListSeatCtaScene";
import { LIST_SEAT_DURATION, LIST_SEAT_SCENES } from "./easywed/list-seat/timeline";
import { TableShape } from "./easywed/table-shape/TableShape";
import { TableShapeHookScene } from "./easywed/table-shape/scenes/TableShapeHookScene";
import { TableShapeShapeScene } from "./easywed/table-shape/scenes/TableShapeShapeScene";
import { TableShapeTurnScene } from "./easywed/table-shape/scenes/TableShapeTurnScene";
import { TableShapeCtaScene } from "./easywed/table-shape/scenes/TableShapeCtaScene";
import { TABLE_SHAPE_DURATION, TABLE_SHAPE_SCENES } from "./easywed/table-shape/timeline";
import { TenTables } from "./easywed/ten-tables/TenTables";
import { TenTablesHookScene } from "./easywed/ten-tables/scenes/TenTablesHookScene";
import { TenTablesBatchScene } from "./easywed/ten-tables/scenes/TenTablesBatchScene";
import { TenTablesRoomScene } from "./easywed/ten-tables/scenes/TenTablesRoomScene";
import { TenTablesCtaScene } from "./easywed/ten-tables/scenes/TenTablesCtaScene";
import { TEN_TABLES_DURATION, TEN_TABLES_SCENES } from "./easywed/ten-tables/timeline";
import { TryNow } from "./easywed/try-now/TryNow";
import { TryNowHookScene } from "./easywed/try-now/scenes/TryNowHookScene";
import { TryNowTableScene } from "./easywed/try-now/scenes/TryNowTableScene";
import { TryNowSeatScene } from "./easywed/try-now/scenes/TryNowSeatScene";
import { TryNowCtaScene } from "./easywed/try-now/scenes/TryNowCtaScene";
import { TRY_NOW_DURATION, TRY_NOW_SCENES } from "./easywed/try-now/timeline";
import { TodoList } from "./easywed/todo-list/TodoList";
import { TodoListHookScene } from "./easywed/todo-list/scenes/TodoListHookScene";
import { TodoListListScene } from "./easywed/todo-list/scenes/TodoListListScene";
import { TodoListAddScene } from "./easywed/todo-list/scenes/TodoListAddScene";
import { TodoListCtaScene } from "./easywed/todo-list/scenes/TodoListCtaScene";
import { TODO_LIST_DURATION, TODO_LIST_SCENES } from "./easywed/todo-list/timeline";
import { CarouselEpisode } from "./easywed/carousel/CarouselEpisode";
import { STRESS_AWAY_DURATION, StressAway } from "./easywed/stress-away/StressAway";
import { WalkthroughLong } from "./easywed/walkthrough-long/WalkthroughLong";
import { FloorsScene } from "./easywed/walkthrough-long/scenes/FloorsScene";
import {
  WALKTHROUGH_LONG_DURATION,
  WALKTHROUGH_LONG_SCENES,
  WALKTHROUGH_LONG_VERTICAL_DURATION,
} from "./easywed/walkthrough-long/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Composition ids are the brand as it is written everywhere else -
          lowercase, never "Easywed" - and ids can't hold the trailing dot. */}
      <Composition
        id="easywed-demo"
        component={Film}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Same scenes; they switch to the portrait hall and mobile chrome on their own. */}
      <Composition
        id="easywed-demo-vertical"
        component={Film}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 15 s social cut - same palette and components, its own beats. */}
      <Composition
        id="easywed-teaser"
        component={Teaser}
        durationInFrames={TEASER_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-teaser-vertical"
        component={Teaser}
        durationInFrames={TEASER_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 83 s YouTube tour - the walkthrough's scenes with a second hall, the
          other films' beats as chapters between them. */}
      <Composition
        id="easywed-walkthrough"
        component={WalkthroughLong}
        durationInFrames={WALKTHROUGH_LONG_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* The same tour in portrait, 78.5 s: the measure chapter has no phone equivalent at v1. */}
      <Composition
        id="easywed-walkthrough-vertical"
        component={WalkthroughLong}
        durationInFrames={WALKTHROUGH_LONG_VERTICAL_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 20 s import cut - the guest list already in Excel, read in and seated. */}
      <Composition
        id="easywed-import"
        component={ImportExcel}
        durationInFrames={IMPORT_EXCEL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-import-vertical"
        component={ImportExcel}
        durationInFrames={IMPORT_EXCEL_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 18 s kitchen-report cut - the diets on the list, printed for the venue, florist and kitchen. */}
      <Composition
        id="easywed-report"
        component={KitchenReport}
        durationInFrames={KITCHEN_REPORT_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-report-vertical"
        component={KitchenReport}
        durationInFrames={KITCHEN_REPORT_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 17 s kids cut - two age brackets typed onto the guest list, and the count that follows. */}
      <Composition
        id="easywed-kids"
        component={KidsCount}
        durationInFrames={KIDS_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-kids-vertical"
        component={KidsCount}
        durationInFrames={KIDS_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 17 s seat-swap cut - the same move as the loop, the names typed into the
          popover's search, closing on the CTA. */}
      <Composition
        id="easywed-swap-cut"
        component={SeatSwapCut}
        durationInFrames={SWAP_CUT_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="easywed-swap-cut-vertical"
        component={SeatSwapCut}
        durationInFrames={SWAP_CUT_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 17 s keep-apart cut - Stół 6 taken away from the DJ, then a family table
          dragged across the dance floor with its guests; 9:16 only, the unsuffixed
          id left free for a 16:9 loop. */}
      <Composition
        id="easywed-apart-vertical"
        component={KeepApart}
        durationInFrames={KEEP_APART_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 18 s mama-link cut - mum's questions, a view-only link made on the laptop,
          mum finding the uncle on her own phone; 9:16 only. */}
      <Composition
        id="easywed-mama-vertical"
        component={MamaLink}
        durationInFrames={MAMA_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 22.7 s sunday-couch cut - one evening on one laptop, the empty hall at
          19:40 to everyone seated at 22:30, told by a clock and two voices; 9:16 only. */}
      <Composition
        id="easywed-couch-vertical"
        component={SundayCouch}
        durationInFrames={SUNDAY_COUCH_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

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
        <Composition
          id="easywed-stress-away"
          component={StressAway}
          durationInFrames={STRESS_AWAY_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_HEIGHT}
        />
        <Composition
          id="easywed-stress-away-square"
          component={StressAway}
          durationInFrames={STRESS_AWAY_DURATION}
          fps={FPS}
          width={CAROUSEL_WIDTH}
          height={CAROUSEL_WIDTH}
        />
        <Composition
          id="easywed-stress-away-vertical"
          component={StressAway}
          durationInFrames={STRESS_AWAY_DURATION}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The landing-page loops - 16:9 only, no CTA, each closing on `LoopSeam`
          back to its frame 0 - with their beats nested beside them. */}
      <Folder name="Landing-loops">
        {/* The 12 s landing-page loop - two distances measured in metres; 16:9 only, no CTA, loops back to frame 0. */}
        <Composition
          id="easywed-scale"
          component={ToScale}
          durationInFrames={SCALE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />

        {/* The 13 s seat-swap loop - one guest moved onto a taken chair, the one she
            turned out given hers; 16:9 only, no CTA, loops back to frame 0. */}
        <Composition
          id="easywed-swap"
          component={SeatSwap}
          durationInFrames={SWAP_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />

        {/* The 12 s odd-room loop - the rectangle turned into the L the room really is,
            one corner pulled out by hand; 16:9 only, no CTA, loops back to frame 0. */}
        <Composition
          id="easywed-shape"
          component={OddRoom}
          durationInFrames={SHAPE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />

        {/* The to-scale loop's beats, at 16:9 - the only size it is made for. */}
        <Folder name="Scale">
          <Composition id="ScaleHook" component={ScaleHookScene} durationInFrames={SCALE_SCENES.hook} fps={FPS} width={WIDTH} height={HEIGHT} />
          <Composition id="ScaleMeasure" component={ScaleMeasureScene} durationInFrames={SCALE_SCENES.measure} fps={FPS} width={WIDTH} height={HEIGHT} />
          <Composition id="ScaleGap" component={ScaleGapScene} durationInFrames={SCALE_SCENES.gap} fps={FPS} width={WIDTH} height={HEIGHT} />
        </Folder>

        {/* The seat-swap loop's beats, at 16:9 - the only size it is made for. */}
        <Folder name="Swap">
          <Composition id="SwapHook" component={SwapHookScene} durationInFrames={SWAP_SCENES.hook} fps={FPS} width={WIDTH} height={HEIGHT} />
          <Composition id="SwapPick" component={SwapPickScene} durationInFrames={SWAP_SCENES.pick} fps={FPS} width={WIDTH} height={HEIGHT} />
          <Composition id="SwapReseat" component={SwapReseatScene} durationInFrames={SWAP_SCENES.reseat} fps={FPS} width={WIDTH} height={HEIGHT} />
        </Folder>

        {/* The odd-room loop's beats, at 16:9 - the only size it is made for. */}
        <Folder name="Shape">
          <Composition id="ShapeHook" component={ShapeHookScene} durationInFrames={SHAPE_SCENES.hook} fps={FPS} width={WIDTH} height={HEIGHT} />
          <Composition id="ShapeL" component={ShapeLScene} durationInFrames={SHAPE_SCENES.lShape} fps={FPS} width={WIDTH} height={HEIGHT} />
          <Composition id="ShapeEdit" component={ShapeEditScene} durationInFrames={SHAPE_SCENES.edit} fps={FPS} width={WIDTH} height={HEIGHT} />
        </Folder>
      </Folder>

      {/* Each scene on its own, so a single beat can be previewed in isolation. */}
      <Folder name="Scenes">
        <Composition id="Intro" component={IntroScene} durationInFrames={SCENES.intro} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Hall" component={HallScene} durationInFrames={SCENES.hall} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Guests" component={GuestsScene} durationInFrames={SCENES.guests} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Seating" component={SeatingScene} durationInFrames={SCENES.seating} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Outro" component={OutroScene} durationInFrames={SCENES.outro} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>

      {/* The long walkthrough's one scene of its own, at 16:9 - the cut it is made for.
          Its other chapters are registered with the films they come from. */}
      <Folder name="Walkthrough-long">
        <Composition id="Floors" component={FloorsScene} durationInFrames={WALKTHROUGH_LONG_SCENES.floors} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>

      {/* The todo-list cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Todo-list">
        <Composition id="TodoHook" component={TodoListHookScene} durationInFrames={TODO_LIST_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TodoRows" component={TodoListListScene} durationInFrames={TODO_LIST_SCENES.list} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TodoAdd" component={TodoListAddScene} durationInFrames={TODO_LIST_SCENES.add} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TodoCta" component={TodoListCtaScene} durationInFrames={TODO_LIST_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The teaser's beats, registered at 9:16 - the cut it is made for, and
          the one whose stacked layouts need the most checking. */}
      <Folder name="Teaser">
        <Composition id="Hook" component={HookScene} durationInFrames={TEASER_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="Chaos" component={ChaosScene} durationInFrames={TEASER_SCENES.chaos} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="Plan" component={PlanScene} durationInFrames={TEASER_SCENES.plan} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="Cta" component={CtaScene} durationInFrames={TEASER_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The import cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Import">
        <Composition id="ImportHook" component={ImportHookScene} durationInFrames={IMPORT_EXCEL_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ImportDrop" component={ImportDropScene} durationInFrames={IMPORT_EXCEL_SCENES.drop} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ImportMap" component={ImportMapScene} durationInFrames={IMPORT_EXCEL_SCENES.map} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ImportLanded" component={ImportLandedScene} durationInFrames={IMPORT_EXCEL_SCENES.landed} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The kitchen-report cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Report">
        <Composition id="ReportHook" component={ReportHookScene} durationInFrames={KITCHEN_REPORT_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ReportTags" component={ReportTagsScene} durationInFrames={KITCHEN_REPORT_SCENES.tags} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ReportSheet" component={ReportSheetScene} durationInFrames={KITCHEN_REPORT_SCENES.sheet} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ReportCta" component={ReportCtaScene} durationInFrames={KITCHEN_REPORT_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The kids cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Kids">
        <Composition id="KidsHook" component={KidsHookScene} durationInFrames={KIDS_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="KidsTag" component={KidsTagScene} durationInFrames={KIDS_SCENES.tag} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="KidsCount" component={KidsCountScene} durationInFrames={KIDS_SCENES.count} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="KidsCta" component={KidsCtaScene} durationInFrames={KIDS_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The seat-swap cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="Swap-cut">
        <Composition id="SwapCutHook" component={SwapCutHookScene} durationInFrames={SWAP_CUT_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="SwapCutPick" component={SwapCutPickScene} durationInFrames={SWAP_CUT_SCENES.pick} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="SwapCutReseat" component={SwapCutReseatScene} durationInFrames={SWAP_CUT_SCENES.reseat} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="SwapCutCta" component={SwapCutCtaScene} durationInFrames={SWAP_CUT_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The keep-apart cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Keep-apart">
        <Composition id="ApartHook" component={ApartHookScene} durationInFrames={KEEP_APART_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ApartUncle" component={ApartUncleScene} durationInFrames={KEEP_APART_SCENES.uncle} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ApartParents" component={ApartParentsScene} durationInFrames={KEEP_APART_SCENES.parents} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ApartCta" component={ApartCtaScene} durationInFrames={KEEP_APART_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The mama-link cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Mama-link">
        <Composition id="MamaHook" component={MamaHookScene} durationInFrames={MAMA_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="MamaInvite" component={MamaInviteScene} durationInFrames={MAMA_SCENES.invite} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="MamaPhone" component={MamaPhoneScene} durationInFrames={MAMA_SCENES.phone} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="MamaCta" component={MamaCtaScene} durationInFrames={MAMA_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The sunday-couch cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Sunday-couch">
        <Composition id="CouchHook" component={CouchHookScene} durationInFrames={SUNDAY_COUCH_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="CouchHall" component={CouchHallScene} durationInFrames={SUNDAY_COUCH_SCENES.hall} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="CouchSeating" component={CouchSeatingScene} durationInFrames={SUNDAY_COUCH_SCENES.seating} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="CouchDone" component={CouchDoneScene} durationInFrames={SUNDAY_COUCH_SCENES.done} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="CouchCta" component={CouchCtaScene} durationInFrames={SUNDAY_COUCH_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The list-seat cut's beats, at 9:16 - the cut it is made for. */}
      <Folder name="List-seat">
        <Composition id="ListSeatHook" component={ListSeatHookScene} durationInFrames={LIST_SEAT_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ListSeatTables" component={ListSeatTablesScene} durationInFrames={LIST_SEAT_SCENES.tables} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ListSeatSeat" component={ListSeatSeatScene} durationInFrames={LIST_SEAT_SCENES.seat} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="ListSeatCta" component={ListSeatCtaScene} durationInFrames={LIST_SEAT_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The table-shape cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Table-shape">
        <Composition id="TableShapeHook" component={TableShapeHookScene} durationInFrames={TABLE_SHAPE_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TableShapeShape" component={TableShapeShapeScene} durationInFrames={TABLE_SHAPE_SCENES.shape} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TableShapeTurn" component={TableShapeTurnScene} durationInFrames={TABLE_SHAPE_SCENES.turn} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TableShapeCta" component={TableShapeCtaScene} durationInFrames={TABLE_SHAPE_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The ten-tables cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Ten-tables">
        <Composition id="TenTablesHook" component={TenTablesHookScene} durationInFrames={TEN_TABLES_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TenTablesBatch" component={TenTablesBatchScene} durationInFrames={TEN_TABLES_SCENES.batch} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TenTablesRoom" component={TenTablesRoomScene} durationInFrames={TEN_TABLES_SCENES.room} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TenTablesCta" component={TenTablesCtaScene} durationInFrames={TEN_TABLES_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

      {/* The try-now speedrun's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Try-now">
        <Composition id="TryNowHook" component={TryNowHookScene} durationInFrames={TRY_NOW_SCENES.hook} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TryNowTable" component={TryNowTableScene} durationInFrames={TRY_NOW_SCENES.table} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TryNowSeat" component={TryNowSeatScene} durationInFrames={TRY_NOW_SCENES.seat} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
        <Composition id="TryNowCta" component={TryNowCtaScene} durationInFrames={TRY_NOW_SCENES.cta} fps={FPS} width={VERTICAL_WIDTH} height={VERTICAL_HEIGHT} />
      </Folder>

    </>
  );
};
