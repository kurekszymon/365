import { bench, group, summary, run, do_not_optimize } from "mitata";
import { Direction as EnumDirection, Priority } from "./patterns/enum";
import { Direction as AsConstDirection } from "./patterns/as-const";

const rawString: string = "UP";
const STRING_DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;

const AsConstPriority = { Low: 0, Medium: 1, High: 2 } as const;
type AsConstPriority = (typeof AsConstPriority)[keyof typeof AsConstPriority];
const asConstPriorityReverseMap = new Map(
  Object.entries(AsConstPriority).map(([k, v]) => [v, k] as const)
);

const enumSet = new Set<string>(Object.values(EnumDirection));
const asConstSet = new Set<string>(Object.values(AsConstDirection));
const stringSet = new Set<string>(STRING_DIRECTIONS);

const plainObj = { Up: "UP", Down: "DOWN", Left: "LEFT", Right: "RIGHT" };
const asConstObj = { Up: "UP", Down: "DOWN", Left: "LEFT", Right: "RIGHT" } as const;

const cachedLabelMap = new Map<string, string>([
  [EnumDirection.Up, "going up"],
  [EnumDirection.Down, "going down"],
  [EnumDirection.Left, "going left"],
  [EnumDirection.Right, "going right"],
]);

summary(() => {
  // numeric enums get reverse-mapped: { 0: "Low", 1: "Medium", 2: "High", Low: 0, Medium: 1, High: 2 }
  // Object.keys iterates ALL six keys, not just the three you defined
  group("Object.keys — numeric enum reverse-mapping cost", () => {
    bench("string enum (Direction)", () => do_not_optimize(Object.keys(EnumDirection)));
    bench("numeric enum (Priority) ← reverse-mapped, 6 keys", () => do_not_optimize(Object.keys(Priority)));
    bench("as const (Priority equivalent)", () => do_not_optimize(Object.keys(AsConstPriority)));
  });

  group("Object.entries — numeric enum reverse-mapping cost", () => {
    bench("string enum", () => do_not_optimize(Object.entries(EnumDirection)));
    bench("numeric enum ← 6 entries, both directions", () => do_not_optimize(Object.entries(Priority)));
    bench("as const", () => do_not_optimize(Object.entries(AsConstPriority)));
  });

  // no allocation, no hash lookup — sequential comparisons the JIT can inline
  group("membership — inline OR chain vs Set.has vs array.includes", () => {
    bench("inline OR chain", () =>
      do_not_optimize(
        rawString === "UP" || rawString === "DOWN" || rawString === "LEFT" || rawString === "RIGHT"
      )
    );
    bench("precomputed Set.has", () => do_not_optimize(stringSet.has(rawString)));
    bench("frozen array.includes", () =>
      do_not_optimize((STRING_DIRECTIONS as readonly string[]).includes(rawString))
    );
    bench("Object.values().includes (per-call)", () =>
      do_not_optimize((Object.values(EnumDirection) as string[]).includes(rawString))
    );
  });

  // once you cache the Set, the pattern you started with is irrelevant
  group("precomputed Set.has — pattern makes no difference", () => {
    bench("enum Set", () => do_not_optimize(enumSet.has("UP")));
    bench("as const Set", () => do_not_optimize(asConstSet.has("UP")));
    bench("string union Set", () => do_not_optimize(stringSet.has("UP")));
  });

  // `as const` is purely a type-level assertion — zero runtime cost vs a plain object
  group("as const vs plain object — runtime identical", () => {
    bench("plain object", () => do_not_optimize(plainObj.Up));
    bench("as const (readonly type only)", () => do_not_optimize(asConstObj.Up));
    bench("enum (for reference)", () => do_not_optimize(EnumDirection.Up));
  });

  group("Map construction — per call vs cached", () => {
    bench("new Map per call ← don't do this", () => {
      const m = new Map<string, string>([
        [EnumDirection.Up, "going up"],
        [EnumDirection.Down, "going down"],
        [EnumDirection.Left, "going left"],
        [EnumDirection.Right, "going right"],
      ]);
      do_not_optimize(m.get("UP"));
    });
    bench("cached Map.get", () => do_not_optimize(cachedLabelMap.get("UP")));
  });

  // Priority[1] → "Medium" is built into numeric enums for free
  // as const has no reverse mapping — needs a Map, but cached it's nearly as fast
  group("reverse mapping — numeric enum built-in vs as const workaround", () => {
    bench("numeric enum: Priority[1]", () => do_not_optimize(Priority[1]));
    bench("as const: cached reverse Map.get(1)", () =>
      do_not_optimize(asConstPriorityReverseMap.get(1))
    );
    bench("as const: new reverse Map per call ← don't do this", () => {
      const m = new Map(Object.entries(AsConstPriority).map(([k, v]) => [v, k] as const));
      do_not_optimize(m.get(1));
    });
  });
});

await run();
