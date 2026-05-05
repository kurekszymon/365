import { bench, group, summary, run, do_not_optimize } from "mitata";
import { Direction as EnumDirection, Priority } from "./patterns/enum";
import { Direction as AsConstDirection } from "./patterns/as-const";

// ─── test data ────────────────────────────────────────────────────────────────

const enumVal = EnumDirection.Up;
const asConstVal = AsConstDirection.Up;
const rawString: string = "UP";

// string union — no runtime object, parallel array is the only option
const STRING_DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;
type StringDirection = (typeof STRING_DIRECTIONS)[number];

// Symbol-based as const — a third flavour: values are unique symbols, not strings
const SymbolDirection = {
  Up: Symbol("UP"),
  Down: Symbol("DOWN"),
  Left: Symbol("LEFT"),
  Right: Symbol("RIGHT"),
} as const;
type SymbolDirection = (typeof SymbolDirection)[keyof typeof SymbolDirection];
const symbolVal = SymbolDirection.Up;

// frozen plain object — as const gives readonly type, Object.freeze gives runtime immutability
const FrozenDirection = Object.freeze({
  Up: "UP",
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
});

// numeric enum — for bitfield and reverse-mapping tests
const enum_perm_vals = [1, 2, 4] as const; // matching Permission numeric values below
enum Permission {
  Read = 1,
  Write = 2,
  Execute = 4,
}
const AsConstPermission = { Read: 1, Write: 2, Execute: 4 } as const;
type AsConstPermission = (typeof AsConstPermission)[keyof typeof AsConstPermission];

const granted = Permission.Read | Permission.Write; // 3
const asConstGranted = AsConstPermission.Read | AsConstPermission.Write;

// ─── precomputed lookup structures (built once, reused across calls) ──────────

const enumSet = new Set<string>(Object.values(EnumDirection));
const asConstSet = new Set<string>(Object.values(AsConstDirection));
const stringSet = new Set<string>(STRING_DIRECTIONS);

const frozenStringArr = Object.freeze(["UP", "DOWN", "LEFT", "RIGHT"]);

// label maps for dispatch tests
const enumLabelMap = new Map<string, string>([
  [EnumDirection.Up, "going up"],
  [EnumDirection.Down, "going down"],
  [EnumDirection.Left, "going left"],
  [EnumDirection.Right, "going right"],
]);
const enumLabelObj: Record<string, string> = {
  [EnumDirection.Up]: "going up",
  [EnumDirection.Down]: "going down",
  [EnumDirection.Left]: "going left",
  [EnumDirection.Right]: "going right",
};

// cycling inputs to defeat branch prediction in dispatch benchmarks
const enumCycle = Object.values(EnumDirection);
const asConstCycle = Object.values(AsConstDirection);
const rawCycle: StringDirection[] = ["UP", "DOWN", "LEFT", "RIGHT"];
let ci = 0;

// ─── benchmark groups ─────────────────────────────────────────────────────────

summary(() => {

  // ── 1. property access ──────────────────────────────────────────────────────
  group("property access", () => {
    bench("enum", () => do_not_optimize(EnumDirection.Up));
    bench("as const", () => do_not_optimize(AsConstDirection.Up));
    bench("frozen object", () => do_not_optimize(FrozenDirection.Up));
    bench("Symbol as const", () => do_not_optimize(SymbolDirection.Up));
    bench("string literal (raw)", () => do_not_optimize(rawString));
  });

  // ── 2. equality check ───────────────────────────────────────────────────────
  group("equality check", () => {
    bench("enum", () => do_not_optimize(enumVal === EnumDirection.Up));
    bench("as const", () => do_not_optimize(asConstVal === AsConstDirection.Up));
    bench("frozen object", () => do_not_optimize(FrozenDirection.Up === "UP"));
    bench("Symbol as const (===)", () => do_not_optimize(symbolVal === SymbolDirection.Up));
    bench("string literal", () => do_not_optimize(rawString === "UP"));
  });

  // ── 3. membership: per-call allocation ──────────────────────────────────────
  group("membership — per call (allocates)", () => {
    bench("enum: Object.values().includes", () =>
      do_not_optimize((Object.values(EnumDirection) as string[]).includes("UP"))
    );
    bench("as const: Object.values().includes", () =>
      do_not_optimize((Object.values(AsConstDirection) as string[]).includes("UP"))
    );
    bench("string union: array.includes (frozen)", () =>
      do_not_optimize(frozenStringArr.includes("UP"))
    );
  });

  // ── 4. membership: precomputed Set ──────────────────────────────────────────
  group("membership — precomputed Set.has (O(1))", () => {
    bench("enum Set", () => do_not_optimize(enumSet.has("UP")));
    bench("as const Set", () => do_not_optimize(asConstSet.has("UP")));
    bench("string union Set", () => do_not_optimize(stringSet.has("UP")));
  });

  // ── 5. membership: precomputed frozen array ──────────────────────────────────
  group("membership — precomputed frozen array.includes", () => {
    bench("enum (frozen array)", () =>
      do_not_optimize(frozenStringArr.includes(enumVal))
    );
    bench("as const (frozen array)", () =>
      do_not_optimize(frozenStringArr.includes(asConstVal))
    );
    bench("string union (frozen array)", () =>
      do_not_optimize(frozenStringArr.includes(rawString))
    );
  });

  // ── 6. membership: inline OR chain (no object) ───────────────────────────────
  group("membership — inline OR chain", () => {
    bench("enum", () =>
      do_not_optimize(
        enumVal === "UP" || enumVal === "DOWN" || enumVal === "LEFT" || enumVal === "RIGHT"
      )
    );
    bench("as const", () =>
      do_not_optimize(
        asConstVal === "UP" || asConstVal === "DOWN" || asConstVal === "LEFT" || asConstVal === "RIGHT"
      )
    );
    bench("string literal", () =>
      do_not_optimize(
        rawString === "UP" || rawString === "DOWN" || rawString === "LEFT" || rawString === "RIGHT"
      )
    );
  });

  // ── 7. enumeration: Object.keys ─────────────────────────────────────────────
  // string enum keys === values, numeric enum keys include reverse-mapped numbers!
  group("enumeration — Object.keys", () => {
    bench("string enum (Direction)", () => do_not_optimize(Object.keys(EnumDirection)));
    bench("numeric enum (Priority)", () => do_not_optimize(Object.keys(Priority)));
    bench("as const", () => do_not_optimize(Object.keys(AsConstDirection)));
    bench("frozen object", () => do_not_optimize(Object.keys(FrozenDirection)));
  });

  // ── 8. enumeration: Object.values ───────────────────────────────────────────
  group("enumeration — Object.values", () => {
    bench("string enum", () => do_not_optimize(Object.values(EnumDirection)));
    bench("numeric enum", () => do_not_optimize(Object.values(Priority)));
    bench("as const", () => do_not_optimize(Object.values(AsConstDirection)));
    bench("string union (static array ref)", () => do_not_optimize(STRING_DIRECTIONS));
  });

  // ── 9. enumeration: Object.entries ──────────────────────────────────────────
  group("enumeration — Object.entries", () => {
    bench("string enum", () => do_not_optimize(Object.entries(EnumDirection)));
    bench("numeric enum", () => do_not_optimize(Object.entries(Priority)));
    bench("as const", () => do_not_optimize(Object.entries(AsConstDirection)));
    bench("frozen object", () => do_not_optimize(Object.entries(FrozenDirection)));
  });

  // ── 10. enumeration: for...of ────────────────────────────────────────────────
  group("enumeration — for...of Object.values", () => {
    bench("string enum", () => {
      let s = 0;
      for (const v of Object.values(EnumDirection)) s += v.length;
      do_not_optimize(s);
    });
    bench("as const", () => {
      let s = 0;
      for (const v of Object.values(AsConstDirection)) s += v.length;
      do_not_optimize(s);
    });
    bench("string union (static array)", () => {
      let s = 0;
      for (const v of STRING_DIRECTIONS) s += v.length;
      do_not_optimize(s);
    });
  });

  // ── 11. dispatch: switch ────────────────────────────────────────────────────
  // cycling input to prevent branch prediction collapsing to single path
  group("dispatch — switch statement (cycling input)", () => {
    bench("enum", () => {
      const v = enumCycle[ci++ & 3]!;
      let result: string;
      switch (v) {
        case EnumDirection.Up:    result = "up"; break;
        case EnumDirection.Down:  result = "down"; break;
        case EnumDirection.Left:  result = "left"; break;
        case EnumDirection.Right: result = "right"; break;
        default: result = "unknown";
      }
      do_not_optimize(result);
    });
    bench("as const", () => {
      const v = asConstCycle[ci++ & 3]!;
      let result: string;
      switch (v) {
        case AsConstDirection.Up:    result = "up"; break;
        case AsConstDirection.Down:  result = "down"; break;
        case AsConstDirection.Left:  result = "left"; break;
        case AsConstDirection.Right: result = "right"; break;
        default: result = "unknown";
      }
      do_not_optimize(result);
    });
    bench("string literal", () => {
      const v = rawCycle[ci++ & 3]!;
      let result: string;
      switch (v) {
        case "UP":    result = "up"; break;
        case "DOWN":  result = "down"; break;
        case "LEFT":  result = "left"; break;
        case "RIGHT": result = "right"; break;
        default: result = "unknown";
      }
      do_not_optimize(result);
    });
  });

  // ── 12. dispatch: precomputed Map.get ────────────────────────────────────────
  group("dispatch — precomputed Map.get (cycling input)", () => {
    bench("enum", () => do_not_optimize(enumLabelMap.get(enumCycle[ci++ & 3]!)));
    bench("as const", () => do_not_optimize(enumLabelMap.get(asConstCycle[ci++ & 3]!)));
    bench("string literal", () => do_not_optimize(enumLabelMap.get(rawCycle[ci++ & 3]!)));
  });

  // ── 13. dispatch: precomputed object key lookup ───────────────────────────────
  group("dispatch — precomputed object[key] (cycling input)", () => {
    bench("enum", () => do_not_optimize(enumLabelObj[enumCycle[ci++ & 3]!]));
    bench("as const", () => do_not_optimize(enumLabelObj[asConstCycle[ci++ & 3]!]));
    bench("string literal", () => do_not_optimize(enumLabelObj[rawCycle[ci++ & 3]!]));
  });

  // ── 14. dispatch: if-else chain ──────────────────────────────────────────────
  group("dispatch — if-else chain (cycling input)", () => {
    bench("enum", () => {
      const v = enumCycle[ci++ & 3]!;
      let result: string;
      if (v === EnumDirection.Up) result = "up";
      else if (v === EnumDirection.Down) result = "down";
      else if (v === EnumDirection.Left) result = "left";
      else result = "right";
      do_not_optimize(result);
    });
    bench("as const", () => {
      const v = asConstCycle[ci++ & 3]!;
      let result: string;
      if (v === AsConstDirection.Up) result = "up";
      else if (v === AsConstDirection.Down) result = "down";
      else if (v === AsConstDirection.Left) result = "left";
      else result = "right";
      do_not_optimize(result);
    });
    bench("string literal", () => {
      const v = rawCycle[ci++ & 3]!;
      let result: string;
      if (v === "UP") result = "up";
      else if (v === "DOWN") result = "down";
      else if (v === "LEFT") result = "left";
      else result = "right";
      do_not_optimize(result);
    });
  });

  // ── 15. numeric enum: bitfield ───────────────────────────────────────────────
  group("numeric enum — bitfield AND (has permission)", () => {
    bench("enum: granted & Permission.Read", () =>
      do_not_optimize((granted & Permission.Read) !== 0)
    );
    bench("as const: granted & AsConstPermission.Read", () =>
      do_not_optimize((asConstGranted & AsConstPermission.Read) !== 0)
    );
    bench("raw number: granted & 1", () => do_not_optimize((granted & 1) !== 0));
  });

  group("numeric enum — bitfield OR (grant permission)", () => {
    bench("enum: granted | Permission.Execute", () =>
      do_not_optimize(granted | Permission.Execute)
    );
    bench("as const: granted | AsConstPermission.Execute", () =>
      do_not_optimize(asConstGranted | AsConstPermission.Execute)
    );
    bench("raw number: granted | 4", () => do_not_optimize(granted | 4));
  });

  // ── 16. numeric enum: reverse mapping ───────────────────────────────────────
  // only available on numeric enums — Priority[1] → "Medium"
  group("numeric enum — reverse mapping", () => {
    bench("enum: Priority[1]", () => do_not_optimize(Priority[1]));
    bench("as const + manual Map (precomputed)", () => {
      const reverseMap = new Map(
        Object.entries(AsConstPermission).map(([k, v]) => [v, k])
      );
      do_not_optimize(reverseMap.get(2));
    });
    bench("as const + manual Map (cached)", (() => {
      const reverseMap = new Map(
        Object.entries(AsConstPermission).map(([k, v]) => [v, k])
      );
      return () => do_not_optimize(reverseMap.get(2));
    })());
  });

  // ── 17. string operations ────────────────────────────────────────────────────
  group("string — template literal", () => {
    bench("enum", () => do_not_optimize(`direction: ${EnumDirection.Up}`));
    bench("as const", () => do_not_optimize(`direction: ${AsConstDirection.Up}`));
    bench("frozen object", () => do_not_optimize(`direction: ${FrozenDirection.Up}`));
    bench("string literal", () => do_not_optimize(`direction: ${rawString}`));
  });

  group("string — concatenation", () => {
    bench("enum", () => do_not_optimize("direction: " + EnumDirection.Up));
    bench("as const", () => do_not_optimize("direction: " + AsConstDirection.Up));
    bench("string literal", () => do_not_optimize("direction: " + rawString));
  });

  // ── 18. construction cost ────────────────────────────────────────────────────
  group("construction — new Map per call (bad) vs cached (good)", () => {
    bench("enum: new Map per call", () => {
      const m = new Map<string, string>([
        [EnumDirection.Up, "going up"],
        [EnumDirection.Down, "going down"],
        [EnumDirection.Left, "going left"],
        [EnumDirection.Right, "going right"],
      ]);
      do_not_optimize(m.get("UP"));
    });
    bench("enum: cached Map.get", () => do_not_optimize(enumLabelMap.get("UP")));
    bench("as const: new Map per call", () => {
      const m = new Map<string, string>([
        [AsConstDirection.Up, "going up"],
        [AsConstDirection.Down, "going down"],
        [AsConstDirection.Left, "going left"],
        [AsConstDirection.Right, "going right"],
      ]);
      do_not_optimize(m.get("UP"));
    });
    bench("as const: cached Map.get", () => do_not_optimize(enumLabelMap.get("UP")));
  });

  // ── 19. Symbol as const ──────────────────────────────────────────────────────
  // symbols are unique — no accidental string collision, but can't serialize
  const symArr = Object.values(SymbolDirection);
  const symSet = new Set(symArr);
  group("Symbol as const — access + membership", () => {
    bench("property access", () => do_not_optimize(SymbolDirection.Up));
    bench("equality (===)", () => do_not_optimize(symbolVal === SymbolDirection.Up));
    bench("Set.has", () => do_not_optimize(symSet.has(SymbolDirection.Up)));
    bench("array.includes", () => do_not_optimize(symArr.includes(SymbolDirection.Up)));
  });

  // ── 20. Object.freeze vs as const vs plain object ────────────────────────────
  const plainObj = { Up: "UP", Down: "DOWN", Left: "LEFT", Right: "RIGHT" };
  const asConstObj = { Up: "UP", Down: "DOWN", Left: "LEFT", Right: "RIGHT" } as const;
  const frozenObj = Object.freeze({ Up: "UP", Down: "DOWN", Left: "LEFT", Right: "RIGHT" });
  group("object mutability variants — property access", () => {
    bench("plain object", () => do_not_optimize(plainObj.Up));
    bench("as const (readonly type only)", () => do_not_optimize(asConstObj.Up));
    bench("Object.freeze (runtime immutable)", () => do_not_optimize(frozenObj.Up));
    bench("enum", () => do_not_optimize(EnumDirection.Up));
  });

});

await run();
