export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export const DIRECTIONS = [
  "UP",
  "DOWN",
  "LEFT",
  "RIGHT",
] as const satisfies Direction[];
