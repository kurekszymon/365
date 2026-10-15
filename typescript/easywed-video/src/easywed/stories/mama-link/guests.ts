import { GUESTS, rosterFor, type RosterGuest } from "../../data";
import { tl } from "../../i18n";
import type { HallLayout } from "../../layouts";

/**
 * The uncle mum keeps asking about - keep-apart's Wujek Zbyszek, back by the
 * user's call - and the table the couple sat him at. The couple wrote him on
 * the list the way the family calls him, which is why mum's search finds him.
 */
export const UNCLE = { name: "Zbyszek Pawlak", table: 6 };

/**
 * This wedding's guest list: `rosterFor`'s 58, with the uncle on the first
 * seat at his table that `rosterFor` would have filled with a generated name.
 * Kept here, not in `data.ts`, for the reason `kids-count/guests.ts` gives -
 * the other films are published with the roster as it shipped.
 */
export const guestListFor = (hall: HallLayout): RosterGuest[] => {
  let placed = false;
  return rosterFor(hall.tables).map((guest) => {
    if (
      placed ||
      GUESTS.includes(guest) ||
      guest.table !== tl.hall.table(UNCLE.table)
    )
      return guest;
    placed = true;
    return { name: UNCLE.name, table: guest.table };
  });
};

/**
 * The invite link. `wedding_invitations.token` defaults to two uuids with their
 * dashes stripped - 64 hex characters - and `handleCopy` puts it after
 * `${origin}/invite/`. A made-up one, in that shape.
 */
export const INVITE_URL =
  "https://easywed.app/invite/9c41e07b2f6a4d8e93b5c1f07a2d6e48b3f1c9e05a7d4b2e81c6f93a0d5e7b14";

/**
 * When the couple makes the link - three weeks before `WEDDING.day` - and so
 * when it runs out: the column's default is `now() + interval '14 days'`, and
 * the row prints it with `toLocaleDateString()`.
 */
const INVITED_ON = new Date(2026, 7, 24);
const INVITE_DAYS = 14;
export const INVITE_EXPIRES = new Date(
  INVITED_ON.getFullYear(),
  INVITED_ON.getMonth(),
  INVITED_ON.getDate() + INVITE_DAYS,
);
