import React from "react";
import { Icon } from "../../../components/Icon";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import { APP_PX, type BatchShape, batchDialog, batchRows, DIALOG, FORM } from "./desk";

/**
 * `EntityForms/TableBatchPanelContent.tsx` at easywed/v1 in
 * `Sidebar/EntityEditDialog`, titled *Dodaj stoły* by `usePanelTitle`, with the
 * dialog's check in place of an X. It opens on `INITIAL_FORM` -
 * `DEFAULT_TABLE`'s rectangular 2x1 m, eight seats, and a count of 2 - and runs
 * *Nazwa* (empty, its placeholder showing), *Kształt stołu*, *Średnica* for a
 * round table or *Szerokość* / *Wysokość* and *Orientacja* for a rectangular
 * one, *Liczba miejsc*, *Ile*, and the black *Dodaj N stołów*, pluralised on
 * the count as it stands.
 *
 * Sizes are the app's CSS pixels times `APP_PX`, on the desk.
 */

/** `Input`'s `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`. */
const FOCUS_RING = "0 0 0 3px rgba(123, 115, 107, 0.35)";

const s = APP_PX;

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ height: FORM.label * s, display: "flex", alignItems: "center", fontSize: 14 * s, fontWeight: 500 }}>
    {children}
  </div>
);

const Input: React.FC<{ value: string; placeholder?: string; focused?: boolean }> = ({ value, placeholder, focused }) => (
  <div
    style={{
      height: FORM.input * s,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      padding: `0 ${10 * s}px`,
      borderRadius: 8 * s,
      border: `1px solid ${focused ? colors.inkSoft : colors.border}`,
      boxShadow: focused ? FOCUS_RING : undefined,
      fontSize: 14 * s,
      color: value ? colors.ink : colors.inkSoft,
      whiteSpace: "nowrap",
    }}
  >
    {value || (focused ? "" : placeholder)}
    {focused ? <div style={{ width: 1.5 * s, height: 17 * s, marginLeft: 1, backgroundColor: colors.ink }} /> : null}
  </div>
);

const Field: React.FC<{ label: string; top: number; children: React.ReactNode; left?: number; width?: number }> = ({
  label,
  top,
  children,
  left = 0,
  width,
}) => (
  <div
    style={{
      position: "absolute",
      top: top * s,
      left: left * s,
      width: width === undefined ? "100%" : width * s,
      display: "flex",
      flexDirection: "column",
      gap: FORM.labelGap * s,
    }}
  >
    <Label>{label}</Label>
    {children}
  </div>
);

/** An `xs` button: `default` is the black pill, `outline` the secondary fill with a border. */
const buttonStyle = (on: boolean, pressed: boolean): React.CSSProperties => ({
  flex: 1,
  height: FORM.buttonXs * s,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4 * s,
  border: `1px solid ${on ? colors.primary : colors.border}`,
  backgroundColor: on ? colors.primary : colors.secondary,
  color: on ? colors.primaryInk : colors.ink,
  fontSize: 12 * s,
  fontWeight: 500,
  transform: pressed ? `translateY(${s}px)` : undefined,
});

export type BatchForm = {
  shape: BatchShape;
  /** What each number field shows - `NumberInput`'s raw draft while it is being typed into. */
  width: string;
  height: string;
  capacity: string;
  count: string;
  /** The count the form holds, which the button reads: the last parseable draft. */
  countValue: number;
  focused?: "diameter" | "count";
  pressed?: "round" | "submit";
};

export const TableBatchDialog: React.FC<{ form: BatchForm; opacity: number }> = ({ form, opacity }) => {
  const { box, formTop } = batchDialog(form.shape);
  const { tops } = batchRows(form.shape);
  const round = form.shape === "round";
  const inner = DIALOG.width - DIALOG.pad * 2;
  const half = (inner - FORM.dimGap) / 2;

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        boxSizing: "border-box",
        borderRadius: 12 * s,
        backgroundColor: colors.bg,
        boxShadow: `0 0 0 1px rgba(36, 31, 26, 0.1), 0 ${24 * s}px ${48 * s}px -${12 * s}px rgba(0, 0, 0, 0.18)`,
        fontFamily: fonts.sans,
        color: colors.ink,
        opacity,
        transform: `scale(${0.95 + 0.05 * opacity})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: DIALOG.pad * s,
          right: DIALOG.pad * s,
          top: DIALOG.pad * s,
          height: 36 * s,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontFamily: fonts.heading, fontSize: 16 * s, fontWeight: 500, lineHeight: 1 }}>{tl.app.tableBatch.title}</div>
        <div
          style={{
            width: 36 * s,
            height: 36 * s,
            borderRadius: 999,
            backgroundColor: colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" color={colors.primaryInk} size={20 * s} />
        </div>
      </div>

      <div style={{ position: "absolute", left: DIALOG.pad * s, top: formTop * s, width: inner * s }}>
        <Field label={tl.app.tableForm.name} top={tops.name}>
          <Input value="" placeholder={tl.app.tableBatch.namePlaceholder} />
        </Field>

        <Field label={tl.app.tableForm.shape} top={tops.shape}>
          <div style={{ display: "flex", borderRadius: 10 * s, overflow: "hidden" }}>
            <div style={buttonStyle(!round, false)}>{tl.app.tableForm.rectangular}</div>
            <div style={buttonStyle(round, form.pressed === "round")}>{tl.app.tableForm.round}</div>
          </div>
        </Field>

        {round ? (
          <Field label={tl.app.tableForm.diameter} top={tops.size}>
            <Input value={form.width} focused={form.focused === "diameter"} />
          </Field>
        ) : (
          <>
            <Field label={tl.app.tableForm.width} top={tops.size} width={half}>
              <Input value={form.width} />
            </Field>
            <Field label={tl.app.tableForm.height} top={tops.size} left={half + FORM.dimGap} width={half}>
              <Input value={form.height} />
            </Field>
            <Field label={tl.app.tableForm.rotation} top={tops.rotation}>
              <div style={{ display: "flex", borderRadius: 10 * s, overflow: "hidden" }}>
                <div style={buttonStyle(false, false)}>
                  <Icon name="rotateCw" color={colors.ink} size={14 * s} />
                  {tl.app.tableForm.flip}
                </div>
              </div>
            </Field>
          </>
        )}

        <Field label={tl.app.tableForm.capacity} top={tops.capacity}>
          <Input value={form.capacity} />
        </Field>

        <Field label={tl.app.tableBatch.count} top={tops.count}>
          <Input value={form.count} focused={form.focused === "count"} />
        </Field>

        <div
          style={{
            position: "absolute",
            top: tops.submit * s,
            width: "100%",
            height: FORM.submit * s,
            borderRadius: 10 * s,
            backgroundColor: colors.primary,
            color: colors.primaryInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14 * s,
            fontWeight: 500,
            transform: form.pressed === "submit" ? `translateY(${s}px)` : undefined,
          }}
        >
          {tl.app.tableBatch.submit(form.countValue)}
        </div>
      </div>
    </div>
  );
};
