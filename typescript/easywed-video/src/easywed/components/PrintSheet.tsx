import React from "react";
import { WEDDING, type RosterGuest } from "../data";
import type { HallLayout } from "../layouts";
import { colors, fonts, shadow } from "../theme";
import { HallCanvas } from "./HallCanvas";

/**
 * The printed report - `planner/PlannerPrintView.tsx` at easywed/v1, the page
 * `plan_printed` hands to the browser's print dialog. Three sections on A4
 * landscape paper: a cover with the wedding and its headcount, the hall, then
 * the guests table by table with their diets beside the names
 * (`DEFAULT_PRINT_FIELDS` is name + dietary). Strings are `export.*`,
 * `tables.count` and `guests` from `pl.json`, verbatim.
 *
 * Sizes are the print view's CSS pixels; a page is drawn at `scale`.
 */

/** `PRINT_AREA_PX`: A4 landscape minus the 10 mm `@page` margins, at 96 dpi. */
export const PRINT_PAGE = { width: 1047, height: 718 };

/** Every section's `p-6`. */
const SECTION_PAD = 24;
/** The guest list's `h2` - text-lg's 28px line plus `mb-4`. */
const HEADING_HEIGHT = 28 + 16;
/** `columns-2 gap-8`. */
const COLUMN_GAP = 32;
const COLUMN_WIDTH = (PRINT_PAGE.width - SECTION_PAD * 2 - COLUMN_GAP) / 2;
/** A table block: its text-sm `h3` + `mb-2`, text-xs rows `gap-y-1` apart, `mb-5` under it. */
const GROUP_HEAD = 20 + 8;
const LINE = 16;
const LINE_GAP = 4;
const GROUP_GAP = 20;

export type PrintGroup = { title: string; lines: string[] };

export type PrintPageSpec =
  | { kind: "cover" }
  | { kind: "hall" }
  /** The guest section breaks across pages; only its first page carries the heading. */
  | { kind: "guests"; heading: boolean; columns: PrintGroup[][] };

const groupHeight = (group: PrintGroup) =>
  GROUP_HEAD + group.lines.length * LINE + (group.lines.length - 1) * LINE_GAP;

const pluralRules = new Intl.PluralRules("pl");

/** `tables.count_one` / `_few` / `_many`. */
const tablesCount = (count: number) => {
  const rule = pluralRules.select(count);
  return `${count} ${rule === "one" ? "stół" : rule === "few" ? "stoły" : "stołów"}`;
};

/** `toLocaleDateString` in Polish - "12.09.2026". */
const printedDate = (date: Date) => date.toLocaleDateString("pl-PL");

/**
 * The report's pages. Tables come in `groupGuestsByTable` order - numbers by
 * value, so "Stół pary młodej" follows "Stół 6" - with each table's guests
 * alphabetical (`DEFAULT_GUEST_SORT`). The two columns fill top to bottom and a
 * table never splits (`break-inside-avoid`), so a long list runs onto a second
 * page, where the last columns balance.
 */
export const printPages = (hall: HallLayout, guests: RosterGuest[]): PrintPageSpec[] => {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const groups: PrintGroup[] = [...hall.tables]
    .sort((a, b) => collator.compare(a.label, b.label))
    .map((table) => {
      const seated = guests
        .filter((guest) => guest.table === table.label)
        .sort((a, b) => a.name.localeCompare(b.name, "pl"));
      return {
        title: `${table.label} (${seated.length}/${table.seats} zajętych)`,
        lines: seated.map((guest) => (guest.diet ? `${guest.name} - ${guest.diet}` : guest.name)),
      };
    });

  const pages: PrintPageSpec[] = [{ kind: "cover" }, { kind: "hall" }];
  let next = 0;
  while (next < groups.length) {
    const heading = next === 0;
    const room = PRINT_PAGE.height - SECTION_PAD * 2 - (heading ? HEADING_HEIGHT : 0);
    const fits = (from: number, to: number) =>
      groups.slice(from, to).reduce((sum, group) => sum + groupHeight(group), 0) +
        GROUP_GAP * (to - from - 1) <=
      room;

    const columns: PrintGroup[][] = [[], []];
    // What is left fits on this page: balance it across both columns.
    const rest = groups.length - next;
    if (fits(next, next + Math.ceil(rest / 2)) && fits(next + Math.ceil(rest / 2), groups.length)) {
      columns[0] = groups.slice(next, next + Math.ceil(rest / 2));
      columns[1] = groups.slice(next + Math.ceil(rest / 2));
      next = groups.length;
    } else {
      columns.forEach((column) => {
        const from = next;
        while (next < groups.length && (next === from || fits(from, next + 1))) {
          column.push(groups[next]);
          next++;
        }
      });
    }
    pages.push({ kind: "guests", heading, columns });
  }
  return pages;
};

/**
 * Where the first `groups` tables of a guest page's column sit on the page, in
 * CSS px - so a scene can push in on the lines rather than guess at them.
 */
export const guestColumnRect = (
  page: Extract<PrintPageSpec, { kind: "guests" }>,
  column: number,
  groups: number,
) => {
  const shown = page.columns[column].slice(0, groups);
  return {
    x: SECTION_PAD + column * (COLUMN_WIDTH + COLUMN_GAP),
    y: SECTION_PAD + (page.heading ? HEADING_HEIGHT : 0),
    width: COLUMN_WIDTH,
    height: shown.reduce((sum, group) => sum + groupHeight(group), 0) + GROUP_GAP * (shown.length - 1),
  };
};

const Cover: React.FC<{ hall: HallLayout; guests: RosterGuest[] }> = ({ hall, guests }) => {
  const seated = guests.filter((guest) => guest.table).length;
  return (
    <div
      style={{
        position: "relative",
        height: PRINT_PAGE.height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: SECTION_PAD,
      }}
    >
      <span style={{ fontSize: 72, lineHeight: 1, fontWeight: 700, letterSpacing: "0.1em", color: colors.paperGray800 }}>
        easywed.
      </span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
        <div style={{ fontSize: 30, lineHeight: "36px", fontWeight: 600 }}>{WEDDING.couple}</div>
        <div style={{ fontSize: 16, lineHeight: "24px", color: colors.paperGray700 }}>
          {`Data ślubu: ${printedDate(WEDDING.day)}`}
        </div>
      </div>
      {/* `tables.count` · seated/total `guests`, lowercased as the view does. */}
      <div style={{ fontSize: 14, lineHeight: "20px", color: colors.paperGray600 }}>
        {`${tablesCount(hall.tables.length)} · ${seated}/${guests.length} goście`}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: SECTION_PAD,
          fontSize: 12,
          lineHeight: "16px",
          color: colors.paperGray500,
        }}
      >
        {`Wygenerowano ${printedDate(WEDDING.printedOn)}`}
      </div>
    </div>
  );
};

/** The hall at the largest whole pixels-per-metre that fits the page, as the view scales it. */
const Hall: React.FC<{ hall: HallLayout }> = ({ hall }) => {
  const ppm = Math.floor(
    Math.min(
      (PRINT_PAGE.width - SECTION_PAD * 2) / hall.meters.width,
      (PRINT_PAGE.height - SECTION_PAD * 2) / hall.meters.height,
    ),
  );
  return (
    <div
      style={{
        height: PRINT_PAGE.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: SECTION_PAD,
      }}
    >
      <div style={{ width: hall.meters.width * ppm, height: hall.meters.height * ppm, display: "flex" }}>
        {/* Seats are printed, all of them taken - the planner's "Miejsca" toggle is on. */}
        <HallCanvas
          hall={hall}
          bare
          outline={1}
          floor={1}
          tableIn={hall.tables.map(() => 1)}
          seatFill={hall.tables.map(() => 1)}
        />
      </div>
    </div>
  );
};

const Guests: React.FC<{ page: Extract<PrintPageSpec, { kind: "guests" }> }> = ({ page }) => (
  <div style={{ height: PRINT_PAGE.height, padding: SECTION_PAD }}>
    {page.heading ? (
      <div style={{ marginBottom: 16, fontSize: 18, lineHeight: "28px", fontWeight: 600 }}>Goście</div>
    ) : null}
    <div style={{ display: "flex", gap: COLUMN_GAP }}>
      {page.columns.map((column, c) => (
        <div key={c} style={{ width: COLUMN_WIDTH, display: "flex", flexDirection: "column", gap: GROUP_GAP }}>
          {column.map((group) => (
            <div key={group.title}>
              <div style={{ marginBottom: 8, fontSize: 14, lineHeight: "20px", fontWeight: 600 }}>{group.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: LINE_GAP, fontSize: 12, lineHeight: `${LINE}px` }}>
                {group.lines.map((line, i) => (
                  <div key={line} style={{ display: "flex", gap: 4 }}>
                    <span style={{ width: 20, flexShrink: 0, textAlign: "right", color: colors.paperGray500 }}>
                      {`${i + 1}.`}
                    </span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** One sheet of the report, white paper at A4 landscape proportions. */
export const PrintPage: React.FC<{
  page: PrintPageSpec;
  hall: HallLayout;
  guests: RosterGuest[];
  scale: number;
}> = ({ page, hall, guests, scale }) => (
  <div
    style={{
      width: PRINT_PAGE.width * scale,
      height: PRINT_PAGE.height * scale,
      overflow: "hidden",
      backgroundColor: colors.paper,
      boxShadow: shadow.card,
    }}
  >
    <div
      style={{
        width: PRINT_PAGE.width,
        height: PRINT_PAGE.height,
        transform: `scale(${scale})`,
        transformOrigin: "0 0",
        fontFamily: fonts.sans,
        color: colors.paperInk,
      }}
    >
      {page.kind === "cover" ? <Cover hall={hall} guests={guests} /> : null}
      {page.kind === "hall" ? <Hall hall={hall} /> : null}
      {page.kind === "guests" ? <Guests page={page} /> : null}
    </div>
  </div>
);
