import React from "react";
import { DRAWER_HANDLE, DrawerHandle } from "../../components/HallPanel";
import { Icon } from "../../components/Icon";
import { PAGE_TOP, PHONE } from "../../components/PhoneFrame";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { PREVIEW_SEAT, type FormState, type previewAt } from "../shape";

/**
 * `EntityForms/TablePanelContent.tsx` at easywed/v1 in the phone's
 * `MobilePanelDrawer`, top to bottom: *Nazwa*; *Kształt stołu*, a button group
 * of *Prostokątny* and *Okrągły*; *Średnica* for a round table, or
 * *Szerokość* and *Wysokość* side by side and *Orientacja*'s *Obróć o 90°* for
 * a rectangular one; *Liczba miejsc*; `TableSeatMap`, the live diagram with
 * each taken chair's initials; then *Przypisz gości*. The drawer's header
 * carries a check rather than an X, since the form applies as it goes.
 *
 * The form is taller than `max-h-[85dvh]`, so the drawer stands at that height
 * and covers the whole canvas; what it leaves below the fold scrolls. Sizes
 * are the app's CSS pixels.
 */

/** The app's viewport under the browser bar, and the drawer's `max-h-[85dvh]` of it. */
const VIEWPORT = PHONE.height - PAGE_TOP;
export const DRAWER_HEIGHT = VIEWPORT * 0.85;
/** Its top edge in the phone's CSS px; the sheet itself is drawn inside the viewport, under the browser bar. */
export const DRAWER_TOP = PHONE.height - DRAWER_HEIGHT;
/** `DrawerHeader`: `p-4` round the check's `size-9`. */
const HEADER = 16 + 36 + 16;
/** The form's first row, in the phone's CSS px. */
const CONTENT_TOP = DRAWER_TOP + DRAWER_HANDLE + HEADER;
const PAD_X = 16;
const CONTENT_WIDTH = PHONE.width - PAD_X * 2;

/** `FieldLabel`: `text-sm` at `leading-snug`; `Field`'s `gap-2`; an `h-8` input or an `xs` button's `h-6`; the form's `gap-4`. */
const LABEL = 14 * 1.375;
const LABEL_GAP = 8;
const INPUT = 32;
const BUTTON_XS = 24;
const GAP = 16;
const inputField = LABEL + LABEL_GAP + INPUT;
const buttonField = LABEL + LABEL_GAP + BUTTON_XS;
/** `grid-cols-2 gap-3` under the two dimensions. */
const DIM_GAP = 12;
const dimWidth = (CONTENT_WIDTH - DIM_GAP) / 2;

/** Where each row starts, from the form's top: the round table's rows, or the rectangular one's. */
const rows = (round: boolean) => {
  const heights = round
    ? { name: inputField, shape: buttonField, size: inputField, capacity: inputField }
    : { name: inputField, shape: buttonField, size: inputField, rotation: buttonField, capacity: inputField };
  const tops: Record<string, number> = {};
  let y = 0;
  Object.entries(heights).forEach(([key, height]) => {
    tops[key] = y;
    y += height + GAP;
  });
  return { ...tops, map: y } as { name: number; shape: number; size: number; rotation?: number; capacity: number; map: number };
};

/** `FieldContent`'s `gap-1.5` between the picker's trigger and its `text-xs` count. */
const FOOTER_GAP = 6;
const FOOTER = 16;

/**
 * Where `GuestAssignmentPicker`'s trigger sits, from the form's top, under a
 * seat diagram `previewHeight` tall - and a point at `y` in the form, on the
 * phone screen once the form has scrolled by `scroll`.
 */
export const pickerTriggerTop = (round: boolean, previewHeight: number) =>
  rows(round).map + previewHeight + GAP + LABEL + LABEL_GAP;
export const PICKER_TRIGGER_HEIGHT = INPUT;
export const formToScreen = (y: number, scroll: number) => CONTENT_TOP - scroll + y;
export const FORM_PAD_X = PAD_X;

/** The centres of what the thumb taps, in the phone's CSS px, with the form unscrolled. */
export const TAPS = {
  rectangular: { x: PAD_X + CONTENT_WIDTH / 4, y: CONTENT_TOP + rows(true).shape + LABEL + LABEL_GAP + BUTTON_XS / 2 },
  width: { x: PAD_X + dimWidth / 2, y: CONTENT_TOP + rows(false).size + LABEL + LABEL_GAP + INPUT / 2 },
  height: { x: PAD_X + dimWidth + DIM_GAP + dimWidth / 2, y: CONTENT_TOP + rows(false).size + LABEL + LABEL_GAP + INPUT / 2 },
  rotate: { x: PHONE.width / 2, y: CONTENT_TOP + (rows(false).rotation ?? 0) + LABEL + LABEL_GAP + BUTTON_XS / 2 },
  done: { x: PHONE.width - PAD_X - 18, y: DRAWER_TOP + DRAWER_HANDLE + HEADER / 2 },
};

/** `Input`'s `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`, as `HallPanel` draws it. */
const FOCUS_RING = "0 0 0 3px rgba(123, 115, 107, 0.35)";

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ height: LABEL, display: "flex", alignItems: "center", fontSize: 14, fontWeight: 500, color: colors.ink }}>
    {children}
  </div>
);

/** An `Input` at a phone's `text-base`, with the caret while it is focused, and its placeholder while it is empty. */
const Input: React.FC<{ value: string; focused?: boolean; placeholder?: string }> = ({ value, focused, placeholder }) => (
  <div
    style={{
      height: INPUT,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      padding: "0 10px",
      borderRadius: 10,
      border: `1px solid ${focused ? colors.inkSoft : colors.border}`,
      boxShadow: focused ? FOCUS_RING : undefined,
      fontSize: 16,
      color: colors.ink,
      overflow: "hidden",
      whiteSpace: "nowrap",
    }}
  >
    {value === "" && placeholder ? <span style={{ color: colors.inkSoft }}>{placeholder}</span> : value}
    {focused ? <div style={{ width: 1.5, height: 18, marginLeft: 1, backgroundColor: colors.ink }} /> : null}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: LABEL_GAP }}>
    <Label>{label}</Label>
    {children}
  </div>
);

/** An `xs` button: `default` is the black pill, `outline` the secondary fill with a border. */
const buttonStyle = (on: boolean, pressed: boolean): React.CSSProperties => ({
  height: BUTTON_XS,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "0 8px",
  border: `1px solid ${on ? colors.primary : colors.border}`,
  backgroundColor: on ? colors.primary : colors.secondary,
  color: on ? colors.primaryInk : colors.ink,
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap",
  // `active:translate-y-px`.
  transform: pressed ? "translateY(1px)" : undefined,
});

export const TableEditSheet: React.FC<{
  name: string;
  capacity: number;
  form: FormState;
  preview: ReturnType<typeof previewAt>;
  /** The occupants' initials, indexed like the table's seats. */
  initials: string[];
  /** The guests at the table, in list order - what the picker's trigger lists. */
  guests: string[];
  /** The drawer rising, 0..1, and falling again once the form is done. */
  enter: number;
  /** How far the form has been scrolled under the header, in CSS px. */
  scroll: number;
  pressed: { rectangular: boolean; rotate: boolean; done: boolean };
  /**
   * A table just inserted from a preset, with no name and no guests: the name
   * field shows `tables.name_placeholder`, every chair is the green empty
   * marker with its number (`TableSeatMap`), and the picker's trigger reads
   * `tables.guests_pick`. Left out, the table-shape cut's seated Stół 3.
   */
  fresh?: { namePlaceholder: string; guestsPlaceholder: string };
  /**
   * What the form shows under the picker's trigger once it is scrolled into
   * view: its `guests_selected_of_capacity` count, then `TableSeatList` - the
   * list's title and a row per seat, its occupant or the assign button. Left
   * out, the table-shape cut's form, which never scrolls that far.
   */
  below?: {
    count: string;
    seatListTitle: string;
    seatLabel: (n: number) => string;
    assign: string;
    /** Each seat's occupant, indexed like the table's seats. */
    occupants: ({ initials: string; name: string } | null)[];
  };
}> = ({ name, capacity, form, preview, initials, guests, enter, scroll, pressed, fresh, below }) => {
  if (enter <= 0) return null;
  const f = tl.app.tableForm;
  const top = rows(form.round);

  return (
    <>
      {/* `DrawerOverlay`'s `bg-black/40` over the plan. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: colors.drawerScrim,
          opacity: Math.min(1, enter),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: VIEWPORT - DRAWER_HEIGHT,
          height: DRAWER_HEIGHT,
          transform: `translateY(${(1 - enter) * (DRAWER_HEIGHT + 20)}px)`,
          boxSizing: "border-box",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          backgroundColor: colors.bg,
          boxShadow: "0 -1px 0 0 rgba(36, 31, 26, 0.1), 0 -24px 60px rgba(60, 50, 40, 0.18)",
          fontFamily: fonts.sans,
          overflow: "hidden",
        }}
      >
        <DrawerHandle />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: DRAWER_HANDLE,
            height: HEADER,
            padding: `0 ${PAD_X}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontFamily: fonts.heading, fontSize: 18, lineHeight: "28px", fontWeight: 500, color: colors.ink }}>
            {f.title}
          </div>
          {/* The done check: `size-9 rounded-full bg-primary`, `common.done` its label. */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: pressed.done ? "translateY(1px)" : undefined,
            }}
          >
            <Icon name="check" color={colors.primaryInk} size={20} />
          </div>
        </div>

        {/* The scrolling body, `px-4`: its rows sit absolutely, at the offsets `rows` works out. */}
        <div
          style={{
            position: "absolute",
            left: PAD_X,
            right: PAD_X,
            top: DRAWER_HANDLE + HEADER,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${-scroll}px)` }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: top.name }}>
              <Field label={f.name}>
                <Input value={name} placeholder={fresh?.namePlaceholder} />
              </Field>
            </div>

            <div style={{ position: "absolute", left: 0, right: 0, top: top.shape }}>
              <Field label={f.shape}>
                {/* `ButtonGroup className="w-full"`: the chosen shape `default`, the other `outline`. */}
                <div style={{ display: "flex" }}>
                  {[
                    { label: f.rectangular, on: !form.round, press: pressed.rectangular },
                    { label: f.round, on: form.round, press: false },
                  ].map((button, i) => (
                    <div
                      key={button.label}
                      style={{
                        ...buttonStyle(button.on, button.press),
                        flex: 1,
                        borderLeftWidth: i === 0 ? 1 : 0,
                        borderRadius: i === 0 ? "10px 0 0 10px" : "0 10px 10px 0",
                      }}
                    >
                      {button.label}
                    </div>
                  ))}
                </div>
              </Field>
            </div>

            <div style={{ position: "absolute", left: 0, right: 0, top: top.size }}>
              {form.round ? (
                <Field label={f.diameter}>
                  <Input value={form.diameter} />
                </Field>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: DIM_GAP }}>
                  <Field label={f.width}>
                    <Input value={form.width} focused={form.focus === "width"} />
                  </Field>
                  <Field label={f.height}>
                    <Input value={form.height} focused={form.focus === "height"} />
                  </Field>
                </div>
              )}
            </div>

            {top.rotation !== undefined ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: top.rotation }}>
                <Field label={f.rotation}>
                  <div style={{ ...buttonStyle(false, pressed.rotate), borderRadius: 10 }}>
                    <Icon name="rotateCw" color={colors.ink} size={14} />
                    {f.flip}
                  </div>
                </Field>
              </div>
            ) : null}

            <div style={{ position: "absolute", left: 0, right: 0, top: top.capacity }}>
              <Field label={f.capacity}>
                <Input value={String(capacity)} />
              </Field>
            </div>

            {/* `TableSeatMap`: the footprint and a marker per chair, the occupant's initials on each. */}
            <div
              style={{
                position: "absolute",
                top: top.map,
                left: (CONTENT_WIDTH - preview.boxW) / 2,
                width: preview.boxW,
                height: preview.boxH,
                borderRadius: 10,
                // No box behind a fresh table's diagram, by the user's call; Stół 3 keeps `bg-muted/40`.
                backgroundColor: fresh ? undefined : "rgba(234, 229, 217, 0.4)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: preview.table.x,
                  top: preview.table.y,
                  width: preview.table.w,
                  height: preview.table.h,
                  boxSizing: "border-box",
                  borderRadius: preview.table.radius,
                  border: `1px solid ${colors.tableBorder}`,
                  backgroundColor: colors.table,
                }}
              />
              {preview.seats.map((seat, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: seat.x - PREVIEW_SEAT / 2,
                    top: seat.y - PREVIEW_SEAT / 2,
                    width: PREVIEW_SEAT,
                    height: PREVIEW_SEAT,
                    boxSizing: "border-box",
                    borderRadius: 999,
                    border: `1px solid ${fresh && !initials[i] ? colors.seatEmptyBorder : colors.seatFilledBorder}`,
                    backgroundColor: fresh && !initials[i] ? colors.seatEmpty : colors.seatFilled,
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {fresh && !initials[i] ? i + 1 : initials[i]}
                </div>
              ))}
            </div>

            {/* `GuestAssignmentPicker`, mostly below the fold: its trigger lists the table's guests. */}
            <div style={{ position: "absolute", left: 0, right: 0, top: top.map + preview.boxH + GAP }}>
              <Field label={f.guests}>
                <div
                  style={{
                    height: INPUT,
                    boxSizing: "border-box",
                    padding: "0 10px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.secondary,
                    fontSize: 14,
                    color: colors.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", color: fresh && !guests.length ? colors.inkSoft : undefined }}>
                    {fresh && !guests.length ? fresh.guestsPlaceholder : guests.join(", ")}
                  </span>
                </div>
                {below ? (
                  <div style={{ marginTop: FOOTER_GAP - LABEL_GAP, height: FOOTER, fontSize: 12, lineHeight: `${FOOTER}px`, color: colors.inkSoft }}>
                    {below.count}
                  </div>
                ) : null}
              </Field>
            </div>

            {/* `TableSeatList`: *Miejsca*, then a bordered row per seat - its occupant as a ghost button, or `+ Przypisz`. */}
            {below ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: pickerTriggerTop(form.round, preview.boxH) + INPUT + FOOTER_GAP + FOOTER + GAP,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: colors.ink }}>
                  {below.seatListTitle}
                  <Icon name="info" color={colors.inkSoft} size={14} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {below.occupants.map((occupant, i) => (
                    <div
                      key={i}
                      style={{
                        height: 44,
                        boxSizing: "border-box",
                        padding: "0 10px",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 14,
                      }}
                    >
                      <span style={{ color: colors.inkSoft }}>{below.seatLabel(i + 1)}</span>
                      {occupant ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, color: colors.ink }}>
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              backgroundColor: "rgba(43, 38, 33, 0.1)",
                              color: colors.primary,
                              fontSize: 10,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {occupant.initials}
                          </span>
                          {occupant.name}
                        </span>
                      ) : (
                        <span
                          style={{
                            height: 32,
                            padding: "0 10px",
                            boxSizing: "border-box",
                            borderRadius: 8,
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg,
                            display: "flex",
                            alignItems: "center",
                            fontWeight: 500,
                            color: colors.ink,
                          }}
                        >
                          {below.assign}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
