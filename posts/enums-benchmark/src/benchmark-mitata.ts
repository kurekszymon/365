import { bench, group, summary, run, do_not_optimize } from "mitata";
import { Direction as EnumDirection } from "./patterns/enum";
import { Direction as AsConstDirection } from "./patterns/as-const";

const enumVal = EnumDirection.Up;
const asConstVal = AsConstDirection.Up;
const rawString: string = "UP";
const STRING_DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;

summary(() => {
  group("property access", () => {
    bench("enum", () => do_not_optimize(EnumDirection.Up));
    bench("as const", () => do_not_optimize(AsConstDirection.Up));
    bench("string literal (raw)", () => do_not_optimize(rawString));
  });

  group("equality check", () => {
    bench("enum", () => do_not_optimize(enumVal === EnumDirection.Up));
    bench("as const", () => do_not_optimize(asConstVal === AsConstDirection.Up));
    bench("string literal", () => do_not_optimize(rawString === "UP"));
  });

  group("Object.values / iteration", () => {
    bench("enum", () => do_not_optimize(Object.values(EnumDirection)));
    bench("as const", () => do_not_optimize(Object.values(AsConstDirection)));
    bench("string union (array.length)", () => do_not_optimize(STRING_DIRECTIONS.length));
  });

  group("membership check", () => {
    bench("enum: Object.values includes", () =>
      do_not_optimize((Object.values(EnumDirection) as string[]).includes("UP"))
    );
    bench("as const: Object.values includes", () =>
      do_not_optimize((Object.values(AsConstDirection) as string[]).includes("UP"))
    );
    bench("string union: array includes", () =>
      do_not_optimize((STRING_DIRECTIONS as readonly string[]).includes("UP"))
    );
  });
});

await run();
