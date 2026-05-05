// const enum — fully inlined by tsc, zero runtime presence
// REQUIRES: isolatedModules: false (tsc full-program compilation)
// BREAKS with esbuild/swc/babel single-file transpilation

export const enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

export function move(dir: Direction): string {
  return `moving ${dir}`;
}

// tsc inlines this to: move("UP")
move(Direction.Up);

// no runtime object — cannot iterate
// Object.values(Direction); // ✗ — not possible

// cannot use indexed access with dynamic keys
// Direction[someVar]; // ✗ — error TS2476: A const enum member can only be accessed using a string literal
