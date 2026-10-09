/**
 * What happens on the mama-link cut's clock (`MAMA_STARTS`), shared by its
 * scenes: mum's thread, the couple's laptop, and mum's phone opening the link.
 * Frames are cut-global, so a scene reads them at `frame + MAMA_STARTS.{scene}`.
 */

/**
 * Mum's three messages land in the thread one after another. The first is
 * already there on frame 0, with the hook over it, so the Reel's first frame
 * reads on its own.
 */
export const BUBBLES_IN = [-8, 10, 22] as const;
/** How long a message takes to arrive. */
export const BUBBLE_OVER = 8;

/**
 * The whole thread fits on her screen - the photo the couple sent before, the
 * "before", right above her questions - so rather than scroll, the view
 * pushes in on it.
 */
export const PHOTO_PUSH = [50, 90] as const;

/** The laptop: the pointer comes up from the plan and presses the dashed invite circle. */
export const DESK_POINTER_IN = [94, 102] as const;
export const DESK_TRAVEL = [98, 122] as const;
export const PRESS_INVITE = 124;

/** The view pulls back from the header to the dialog it opened. */
export const CAMERA_TO_DIALOG = [124, 146] as const;
export const DIALOG_OPEN = [126, 132] as const;

/**
 * A press: the pointer arrives two frames before `at`, having set off
 * `travel` frames earlier, and the button reads as held for `PRESS_HELD`.
 */
export type Press = { at: number; travel: number };
export const PRESS_HELD = 5;

/** The dialog's pointer, from the role select down to the copy button. */
export const DIALOG_POINTER_IN = [138, 144] as const;
export const PRESS_ROLE: Press = { at: 154, travel: 14 };
export const PRESS_VIEWER: Press = { at: 168, travel: 10 };
export const PRESS_CREATE: Press = { at: 184, travel: 12 };
export const PRESS_COPY: Press = { at: 208, travel: 14 };
/** Once it has clicked, the pointer eases off the button so *Skopiowano* reads. */
export const POINTER_ASIDE = [214, 228] as const;
export const DIALOG_POINTER_OUT = [246, 256] as const;

/** `handleCreate` refetches, then the pending row shows and the select goes back to *Edytor*. */
export const ROW_IN = [190, 196] as const;
/** `handleCopy` flips the button to *Skopiowano* for 1500 ms. */
export const COPIED = [210, 255] as const;

/** The caption line, over the laptop, once the link is on the clipboard. */
export const CAPTION_IN = [212, 222] as const;

/** Back on mum's phone: the link arrives, and her thread scrolls down to it. */
export const LINK_IN = [272, 280] as const;

/** Taps on mum's phone, each the frame the thumb lands (`Touch`). */
export const TAP_LINK = 292;
export const TAP_GOOGLE = 312;
export const TAP_GUESTS = 346;
export const TAP_SEARCH = 364;

/**
 * What mum's screen shows, each a short crossfade into the next: her thread,
 * the sign-in page `requireAuth` sends her to, *Dołączanie do wesela...* while
 * the invite is claimed, then the plan itself.
 */
export const SIGN_IN = [297, 302] as const;
export const CLAIMING = [317, 321] as const;
export const VIEWER = [333, 339] as const;

/** The guest list's sheet slides up from the tab bar. */
export const DRAWER_UP = [348, 360] as const;

/** Mum types her search a letter at a time. */
export const TYPE_FROM = 368;
export const TYPE_STEP = 3;
