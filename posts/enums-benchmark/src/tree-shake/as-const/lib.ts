export const Direction = {
  Up: "UP",
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];
