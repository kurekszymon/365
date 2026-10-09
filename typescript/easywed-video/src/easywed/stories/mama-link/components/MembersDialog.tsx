import React from "react";
import { Icon, type IconName } from "../../../components/Icon";
import { GUESTS } from "../../../data";
import type { Point } from "../../../geometry";
import { locale, tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";

/**
 * Redraws `dialogs/weddings/MembersWeddingDialog.tsx` at easywed/v1 as the
 * owner sees it on a desktop: `DialogContent` (`sm:max-w-md`, `p-4`, a `gap-4`
 * grid, the ghost close button in the corner) holding *Członkowie*, then
 * `InvitationManager` - the *Rola* select (only *Edytor* and *Podgląd* on
 * offer, *Edytor* first), *Utwórz link zaproszenia*, and the pending list with
 * *Kopiuj link* and the bin - then `MemberList`, and *Zamknij* in the footer.
 *
 * The members are the owner and the couple's partner, who never set a display
 * name, so `getMemberLabel` falls back to the role for them. Strings are
 * `members.*` verbatim. Drawn in the app's CSS pixels; the caller scales it.
 */
export const DIALOG = {
  width: 448,
  pad: 16,
  gap: 16,
  title: 28,
  label: 20,
  labelGap: 8,
  control: 32,
  fieldGap: 12,
  sectionLabel: 16,
  sectionGap: 8,
  row: 54,
  rowGap: 8,
  /** `DialogFooter`: `border-t`, `p-4` round an `h-8` button; its `-mb-4` takes the dialog's bottom padding. */
  footer: 1 + 16 + 32 + 16,
  /** `SelectTrigger` is `w-fit`: pl-2.5, the value, gap-1.5, the chevron, pr-2. */
  trigger: 108,
  /** `SelectItem`: `py-1` round a 20px line; `SelectContent` is `min-w-36` with `p-1`. */
  item: 28,
  list: 144,
  /** The pending row's two `size="sm"` buttons: *Kopiuj link* with its icon, and the icon-only bin. */
  copyButton: 104,
  binButton: 34,
};

const D = DIALOG;
const INVITE_BLOCK = D.label + D.labelGap + D.control + D.fieldGap + D.control;
const PENDING_BLOCK = D.gap + D.sectionLabel + D.sectionGap + D.row;
const MEMBERS_BLOCK = D.sectionLabel + D.sectionGap + D.row * 2 + D.rowGap;
const TRIGGER_TOP = D.pad + D.title + D.gap + D.label + D.labelGap;

/** The dialog's height; the pending list opens `pending` of the way, 0..1. */
export const dialogHeight = (pending: number): number =>
  D.pad + D.title + D.gap + INVITE_BLOCK + PENDING_BLOCK * pending + D.gap + MEMBERS_BLOCK + D.gap + D.footer;

/** Where the pointer aims, from the dialog's top-left, in its own CSS px. */
export const dialogTargets = (): { role: Point; viewer: Point; create: Point; copy: Point } => {
  const rowTop = D.pad + D.title + D.gap + INVITE_BLOCK + D.gap + D.sectionLabel + D.sectionGap;
  return {
    role: { x: D.pad + D.trigger / 2, y: TRIGGER_TOP + D.control / 2 },
    // `item-aligned`: the list opens with the chosen item over the trigger, the next one under it.
    viewer: { x: D.pad + D.list / 2 - 10, y: TRIGGER_TOP + D.control / 2 + D.item },
    create: { x: D.width / 2, y: TRIGGER_TOP + D.control + D.fieldGap + D.control / 2 },
    copy: { x: D.width - D.pad - 1 - 8 - D.binButton - 8 - D.copyButton / 2, y: rowTop + D.row / 2 },
  };
};

const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <div
    style={{
      height: D.sectionLabel,
      fontSize: 12,
      lineHeight: "16px",
      fontWeight: 500,
      color: colors.inkSoft,
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

/** A `size="sm"` button - outline or ghost, with an icon, a label, or both. */
const SmallButton: React.FC<{
  icon?: IconName;
  label?: string;
  outline?: boolean;
  width?: number;
  pressed?: boolean;
}> = ({ icon, label, outline, width, pressed }) => (
  <div
    style={{
      width,
      height: 28,
      flexShrink: 0,
      boxSizing: "border-box",
      padding: "0 10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderRadius: 8,
      border: outline ? `1px solid ${colors.border}` : "1px solid transparent",
      backgroundColor: pressed ? colors.bgDeep : outline ? colors.bg : "transparent",
      fontSize: 12.8,
      fontWeight: 500,
      color: colors.ink,
      whiteSpace: "nowrap",
    }}
  >
    {icon ? <Icon name={icon} color={colors.ink} size={14} /> : null}
    {label}
  </div>
);

/** A bordered two-line row, `p-2`, as both lists draw them. */
const Row: React.FC<{ title: string; detail: string; children: React.ReactNode }> = ({ title, detail, children }) => (
  <div
    style={{
      height: D.row,
      boxSizing: "border-box",
      padding: 8,
      display: "flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
    }}
  >
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 14, lineHeight: "20px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {title}
      </div>
      <div style={{ fontSize: 12, lineHeight: "16px", color: colors.inkSoft }}>{detail}</div>
    </div>
    {children}
  </div>
);

export type MembersDialogState = {
  /** What the *Rola* select holds. */
  role: "editor" | "viewer";
  /** The select's list is open. */
  selectOpen: boolean;
  /** The pointer is down on the viewer item. */
  viewerPressed?: boolean;
  createPressed?: boolean;
  /** `submitting`: the button disables until the refetch lands. */
  submitting?: boolean;
  /** The pending list opening, 0..1. */
  pending: number;
  /** The pending invite's role and expiry. */
  invite: { role: "editor" | "viewer"; expires: Date };
  copyPressed?: boolean;
  /** `copiedId === inv.id`. */
  copied?: boolean;
};

export const MembersDialog: React.FC<MembersDialogState> = ({
  role,
  selectOpen,
  viewerPressed,
  createPressed,
  submitting,
  pending,
  invite,
  copyPressed,
  copied,
}) => {
  const roles = tl.app.members.roles;
  const owner = GUESTS[0].name;
  const targets = dialogTargets();

  return (
    <div
      style={{
        position: "relative",
        width: D.width,
        height: dialogHeight(pending),
        boxSizing: "border-box",
        padding: D.pad,
        paddingBottom: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        backgroundColor: colors.bg,
        boxShadow: "0 0 0 1px rgba(36, 31, 26, 0.1), 0 24px 60px rgba(60, 50, 40, 0.18)",
        fontFamily: fonts.sans,
        color: colors.ink,
      }}
    >
      {/* `DialogContent`'s close button, `absolute top-2 right-2`. */}
      <div style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="x" color={colors.inkSoft} size={16} />
      </div>

      <div style={{ height: D.title, fontFamily: fonts.heading, fontSize: 18, lineHeight: "28px", fontWeight: 600 }}>
        {tl.app.members.title}
      </div>

      {/* `InvitationManager`: the role field and the create button. */}
      <div style={{ marginTop: D.gap, display: "flex", flexDirection: "column", gap: D.fieldGap }}>
        <div style={{ display: "flex", flexDirection: "column", gap: D.labelGap }}>
          <div style={{ height: D.label, display: "flex", alignItems: "center", fontSize: 14, fontWeight: 500 }}>
            {tl.app.members.role}
          </div>
          <div
            style={{
              width: D.trigger,
              height: D.control,
              boxSizing: "border-box",
              padding: "0 8px 0 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              fontSize: 14,
            }}
          >
            {roles[role]}
            <Icon name="chevronDown" color={colors.inkSoft} size={16} />
          </div>
        </div>
        <div
          style={{
            height: D.control,
            borderRadius: 8,
            backgroundColor: colors.primary,
            color: colors.primaryInk,
            opacity: submitting ? 0.5 : createPressed ? 0.8 : 1,
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {tl.app.members.createInvite}
        </div>
      </div>

      {/* The pending list, once the refetch brings the new invite back. */}
      <div style={{ height: PENDING_BLOCK * pending, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ paddingTop: D.gap, display: "flex", flexDirection: "column", gap: D.sectionGap, opacity: pending }}>
          <SectionLabel>{tl.app.members.pending}</SectionLabel>
          <Row
            title={tl.app.members.linkOnly}
            detail={`${roles[invite.role]} · ${tl.app.members.expires(invite.expires.toLocaleDateString(locale))}`}
          >
            <SmallButton
              outline
              width={D.copyButton}
              icon={copied ? "check" : "copy"}
              label={copied ? tl.app.members.copied : tl.app.members.copyLink}
              pressed={copyPressed}
            />
            <SmallButton icon="trash" width={D.binButton} />
          </Row>
        </div>
      </div>

      {/* `MemberList`. */}
      <div style={{ marginTop: D.gap, display: "flex", flexDirection: "column", gap: D.sectionGap }}>
        <SectionLabel>{tl.app.members.active}</SectionLabel>
        <Row title={`${owner} (${tl.app.members.you})`} detail={roles.owner}>
          <SmallButton label={tl.app.members.changeName} />
        </Row>
        <div style={{ marginTop: D.rowGap - D.sectionGap }}>
          <Row title={roles.editor} detail={roles.editor}>
            <SmallButton icon="userX" width={D.binButton} />
          </Row>
        </div>
      </div>

      <div
        style={{
          marginTop: D.gap,
          marginLeft: -D.pad,
          marginRight: -D.pad,
          height: D.footer,
          boxSizing: "border-box",
          padding: D.pad,
          display: "flex",
          justifyContent: "flex-end",
          borderTop: `1px solid ${colors.border}`,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          backgroundColor: "rgba(239, 233, 221, 0.5)",
        }}
      >
        <div
          style={{
            height: 32,
            padding: "0 10px",
            display: "flex",
            alignItems: "center",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {tl.app.members.close}
        </div>
      </div>

      {/* `SelectContent`, `item-aligned`: the chosen item laid over the trigger, a check beside it. */}
      {selectOpen ? (
        <div
          style={{
            position: "absolute",
            left: D.pad,
            top: targets.role.y - D.item / 2 - 4,
            width: D.list,
            boxSizing: "border-box",
            padding: 4,
            borderRadius: 10,
            backgroundColor: colors.bg,
            boxShadow: "0 0 0 1px rgba(36, 31, 26, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
          }}
        >
          {(["editor", "viewer"] as const).map((value) => (
            <div
              key={value}
              style={{
                height: D.item,
                padding: "0 32px 0 6px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                borderRadius: 6,
                fontSize: 14,
                backgroundColor: value === "viewer" && viewerPressed ? colors.secondary : "transparent",
              }}
            >
              {roles[value]}
              {value === role ? (
                <div style={{ position: "absolute", right: 8, display: "flex" }}>
                  <Icon name="check" color={colors.ink} size={16} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
