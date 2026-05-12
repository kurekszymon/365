import { bench, group, summary, run, do_not_optimize } from "mitata";
import { Direction as EnumDirection, Priority } from "./patterns/enum";
import { Direction as AsConstDirection } from "./patterns/as-const";

const STRING_DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;

// fair as-const equivalent of Priority (same 3 numeric values, no reverse mapping)
const AsConstPriority = { Low: 0, Medium: 1, High: 2 } as const;

// numeric enum gets a synthesised reverse map at runtime:
//   Priority → { 0:"Low", 1:"Medium", 2:"High", Low:0, Medium:1, High:2 }
// Object.keys/values/entries walk all 6 entries, not the 3 you defined.
// AsConstPriority has 3 — that's the apples-to-apples comparison.

summary(() => {
  group("enumeration — Object.keys", () => {
    bench("string enum (Direction, 4 keys)", () => do_not_optimize(Object.keys(EnumDirection)));
    bench("numeric enum (Priority) ← reverse-mapped, 6 keys", () => do_not_optimize(Object.keys(Priority)));
    bench("as const numeric (AsConstPriority, 3 keys)", () => do_not_optimize(Object.keys(AsConstPriority)));
    bench("as const string (AsConstDirection, 4 keys)", () => do_not_optimize(Object.keys(AsConstDirection)));
  });
});

summary(() => {
  group("enumeration — Object.values", () => {
    bench("string enum", () => do_not_optimize(Object.values(EnumDirection)));
    bench("numeric enum", () => do_not_optimize(Object.values(Priority)));
    bench("as const numeric", () => do_not_optimize(Object.values(AsConstPriority)));
    bench("string union (static array ref)", () => do_not_optimize(STRING_DIRECTIONS));
  });
});

summary(() => {
  group("enumeration — Object.entries", () => {
    bench("string enum", () => do_not_optimize(Object.entries(EnumDirection)));
    bench("numeric enum ← 6 entries, both directions", () => do_not_optimize(Object.entries(Priority)));
    bench("as const numeric", () => do_not_optimize(Object.entries(AsConstPriority)));
  });
});

await run();
