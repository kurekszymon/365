### THIS ARTICLE IS UNDER DEVELOPMENT

# fwd: enums (WIP)

## preface

the **_enums vs string literals_** is one of those internet rabbit holes\*

Few years back my friend planted a seed of doubt during pair programming, that made me stop at every enum I see. Some time ago, while interviewing for a frontend role, I found myself passing that same seed along.
I want to get this finally sorted so..

I came up with a fancy name of `fwd: enums` - consider this definitive research piece you can forward next time someone tells you to swap your enum for a string union in your PR.

\* said rabbit holes:

- https://www.reddit.com/r/typescript/comments/1e3yyaj/use_string_literal_instead_of_enums/
- https://devsparks.goooseman.dev/hacks/20240715-use-string-literals-not-enums/
- https://www.reddit.com/r/typescript/comments/w9vf2m/question_are_you_using_enums_in_typescript_why_or/

## the contenders

Let's take a look at possible ways of solving enums:

### regular `enum`

in most typed languages you can stumble upon a structure that looks a bit like the example below, but why is it so controversial in TypeScript?

```ts
enum MicCheck {
  One,
  Two,
}

const assignment = MicCheck.One;
```

Because `enums` are one of the few features TypeScript has which is not just a `type-level` extension of JavaScript.
`enums` are real objects that exist at runtime, transpiled down to an IIFE to create an object.

Every usage, becomes a property lookup on that object at runtime, consider previous code snippet:

```ts
// tsc output
var MicCheck;
(function (MicCheck) {
  MicCheck[(MicCheck["One"] = 0)] = "One";
  MicCheck[(MicCheck["Two"] = 1)] = "Two";
})(MicCheck || (MicCheck = {}));

var assignment = MicCheck.One;
```

thanks to that, you can

```ts
enum E {
  F,
  G,
}
// pass it to the function
const f = (e: { F: number }) => e.F;
f(E);

// iterate over enum (keys|values|entries)
Object.entries(E);

// use reverse mapping like (only for numeric enums)
E[1]; // -> 'G'

// note that you wouldn't be able to do that for string enums like
enum A {
  B = "-B",
  C = "C-",
}

A[1]; // -> undefined (no reverse mapping)
```

but of course as it was mentioned you are left with the artifacts, so what are the alternatives?

### `const enum`

unlike a regular `enum`, a `const enum` does not exist at runtime, it is **fully erased** during compilation, so the code above would be transpiled down to

```ts
const enum Enumeration {
  Proper,
  Incomplete,
}

const assignment = Enumeration.Incomplete;

var assignment = 1; /* Enumeration.Incomplete */
```

so there is no object, no IIFE, no runtime lookup, no emitted code for the enum itself, and you get full type safe code and a helpful comment left behind for readability. TypeScript still enforces the enum type, just doesn't emit it.

no runtime presence however makes you lose indexed access - `error TS2476: A const enum member can only be accessed using a string literal.` and the ability to iterate over enum values.

but is it as easy to replace an `enum` with a `const enum` wherever you _don't_ need runtime benefits? well, not exactly.

inlining a `const enum` requires the compiler to see the **full program** - it needs to resolve enum values at every usage site. This works when you compile your program with `tsc`, even if bundler handles the rest (`tsc` emits JS, `webpack`/`rollup` bundles it).

you could make use of it in

- `node.js` backends
- internal tooling / scripts / CLIs
- any project compiled with `tsc`

Modern frontend toolchains (_esbuild_, _swc_, _babel_) have moved to **single-file transpilation**, what means that each `.ts` file is transformed independently, without looking at other files.
A single-file transpiler sees `Enumeration.Incomplete` in one file, but it has no idea what value `Incomplete` resolved to, because the enum definition lives elsewhere.

Set `isolatedModules` to true to make TypeScript warn you if you write certain code that can't be correctly interpreted by this single-file transpilation process [(read more in docs)](https://www.typescriptlang.org/tsconfig/#isolatedModules).

If you were to publish a library with ambient enums (produced by `const enum` usage) - consumers of the library won't be able to use `isolatedModules` and those enum values at the same time. Unless you apply same rules as TypeScript project.

TypeScript project itself avoids publishing ambient enums by using [preserveConstEnums](https://www.typescriptlang.org/tsconfig/#preserveConstEnums), emitting `const enums` like regular enums, but inlining them in their own build. [read more about const enums pitfalls](https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls)

but you could simulate them with

### string literal union

Which is the most straight forward way of defining various possibilities with TypeScript.
Instead of defining a separate entity holding the data, you can declare a type alias

```ts
type Kind = "string" | "other_string";
const f = (s: Kind) => {};
// or inline it
const f = (s: "string" | "other_string") => {};
```

Unlike `const enums` - `string literal union` works with `isolatedModules`.
Similarly to `const enums` it has no runtime, so you cannot iterate over possible values.

Honestly, I don't see many real cons - string unions give you enum-like type checks with zero runtime cost. If you don't inline them, but assign to a type, the intent can be as obvious as for the enum.

If you do need a runtime object that you can derive a `string literal union type` from, you can mark your objects

### `as const`

this is where things get interesting. `as const` is a type assertion that tells TypeScript to infer the **narrowest possible type** for a value - making everything `readonly` and literal all the way down.

```ts
const Direction = {
  Up: "UP",
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
} as const;

// derive the union type from the object
type Direction = (typeof Direction)[keyof typeof Direction];
// -> 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
```

what does this buy you? quite a lot actually:

- you get a **runtime object** you can pass around, iterate over, use in lookups
- you get a **derived union type** that works exactly like a string literal union
- it plays nicely with `isolatedModules` - no cross-file resolution needed
- no IIFE, no reverse mapping weirdness - it's just a plain object

```ts
// iterate over values
Object.values(Direction); // ['UP', 'DOWN', 'LEFT', 'RIGHT']

// use as a type
const move = (dir: Direction) => {};
move(Direction.Up); // ✓
move("UP"); // ✓
move("DIAGONAL"); // ✗ type error

// you can also do arrays
const Roles = ["admin", "user", "guest"] as const;
type Role = (typeof Roles)[number];
// -> 'admin' | 'user' | 'guest'

// and now you can check membership at runtime
Roles.includes(someInput as Role);
```

the `typeof X[keyof typeof X]` pattern looks noisy the first time you see it, but it becomes second nature fast. and unlike `enum`, there is no new syntax to learn - it's just JavaScript objects with a type assertion on top.

the tradeoff? you lose the named namespace feel of `Direction.Up` being exclusively tied to the `Direction` enum type. with `as const`, `Direction.Up` and the raw string `'UP'` are interchangeable - TypeScript won't complain about either. depending on your perspective that's a feature (flexibility) or a bug (less nominal typing).

one more modern flavour worth knowing: `satisfies`. when you want both runtime data and a constraint check at the declaration site, write `[...] as const satisfies Direction[]` — TypeScript verifies the array against the type without widening it.

```ts
const DIRECTIONS = [
  "UP",
  "DOWN",
  "LEFT",
  "RIGHT",
] as const satisfies Direction[];
// type stays the narrow tuple; misspelling 'UPP' fails at the declaration, not the call site
```

### nominal vs structural

the single biggest semantic difference between `enum` and the alternatives — and the one most "string union vs enum" PRs miss:

```ts
enum E {
  Up = "UP",
}
const f = (d: E) => d;
f(E.Up); // ✓
f("UP"); // ✗ Argument of type '"UP"' is not assignable to parameter of type 'E'

const C = { Up: "UP" } as const;
type C = (typeof C)[keyof typeof C];
const g = (d: C) => d;
g(C.Up); // ✓
g("UP"); // ✓ — raw string accepted, no error
```

`enum` is **nominal**: `E.Up` and the raw string `'UP'` are different types, even though they hold the same value. `as const` and string literal union are **structural**: the type _is_ the set of literal values, so raw strings line up just fine.

teams that lean nominal value: misuse is harder, refactors are safer, the import is the type's identity. teams that lean structural value: less ceremony, raw strings interop with JSON / forms / URLs without coercion. neither is wrong. it's the single design decision the runtime cost arguments are a proxy for.

### discriminated unions

string literal unions become more interesting when you compose them. the canonical TS pattern is the tagged union:

```ts
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; s: number }
  | { kind: "rect"; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.r * s.r;
    case "square":
      return s.s * s.s;
    case "rect":
      return s.w * s.h;
  }
}
```

TypeScript narrows `s.r`/`s.s`/`s.w` per branch based on the literal `kind`. this composes with anything that uses a string literal — and substantially less well with `enum`, since the enum member's type is `Shape['kind']` rather than a literal that the narrower can match against directly.

### when to actually reach for `enum`

the verdict at the top says "only if the codebase commits to them" — that's true but doesn't help if you're deciding. legitimate reasons to keep an enum:

- **numeric bit-flags.** `enum Permission { Read = 1, Write = 2, Execute = 4 }` reads naturally, and `granted & Permission.Write` survives refactors better than `granted & 2`. an `as const` object with the same numbers does the exact same job at the same cost — choose whichever your team finds clearer.
- **built-in reverse mapping.** `Priority[1] === 'Medium'` works only on numeric enums. you can replicate it with `as const` + a cached `Map`, but the enum gets it for free.
- **you want nominal typing.** see above. you decide whether that's "stricter" or "noisier".
- **TS 5.x has improved enum ergonomics** (string-enum autocompletion in switch arms, less `keyof typeof` ceremony in callers). if you dismissed enums in 2020, the friction is lower now.

if none of these apply, the choice is mostly cosmetic.

## the benchmark

emitted JS is committed to `out/(sizes|tree-shake)/` so claims can be cross-checked by opening the files.

- bundle-sizes answers: "if I publish this file, how much code ships?" (worst case — assumes every export gets used)
- tree-shaking answers: "if a consumer imports one member, how much survives DCE?" (best case — modern bundler doing its job)

all numbers below are on **Apple M3, Bun 1.3.11**.

### bundle sizes (esbuild, gzipped)

| pattern              | min | gzip | notes                                             |
| -------------------- | --: | ---: | ------------------------------------------------- |
| `enum` (string)      | 368 |  275 | IIFE per declaration                              |
| `as const` object    | 269 |  221 | plain object literal                              |
| string literal union | 176 |  165 | includes `DIRECTIONS` array + `isDirection` guard |
| `const enum` via tsc |  56 |   73 | values fully inlined; smallest by far             |

the type-only line `type Direction = ...` emits zero bytes. the 165-byte string-union number is almost all the runtime guard you wrote, not the type. and the `const enum` "small" number requires you to actually compile through `tsc` — feed the same file through esbuild's per-file transform and you get the regular `enum` IIFE back, as discussed above.

what happens when 20 different call sites reference the pattern? gzip flattens the differences considerably:

| pattern + 20 uses    |  min | gzip |
| -------------------- | ---: | ---: |
| `enum`               | 1059 |  423 |
| `as const`           | 1020 |  376 |
| string literal union |  827 |  309 |

114 bytes between the heaviest and lightest pattern, across 20 usages, after gzip. ~6 bytes per use. for any frontend app where bundle size is a real concern, the choice of enum pattern is the wrong lever to pull.

### tree-shaking — what survives an `import` of one member?

```
pattern        bundled  min  gzip
enum                66   19    39
as-const           189   73    93
string-union        84   19    39
```

the mechanism is two-stage and worth spelling out, because the common framing ("esbuild proves unused members are pure") isn't quite right. esbuild's TS frontend rewrites the enum into a `/* @__PURE__ */`-annotated IIFE — visible in `out/tree-shake/enum-transformed.js`, and notably **not** something `tsc` does (run `tsc` on the same `lib.ts` and you get a bare, unmarked IIFE). it also inlines string-enum member accesses, so `Direction.Up` becomes the literal `"UP"` at the call site. with no remaining reference to the IIFE's result, the pure marker green-lights DCE and the wrapper disappears in `out/tree-shake/enum-bundled.js`. the `as const` object has neither rewrite nor marker (compare `out/tree-shake/as-const-transformed.js` — plain `const` declaration, no annotation), so per-property DCE is off the table and the whole literal ships. string literal union is type-only: nothing to import.

(this one surprised me. the conventional wisdom that "enum keeps all members alive" is true for older bundlers and bare `tsc` output, but modern esbuild is smart enough to inline the single observed access.)

### runtime

call-site operations across all patterns sit within the same ~2–6 ns range on JSC and aren't worth measuring at the headline level. the one place numbers diverge meaningfully is iteration.

### what actually differs

**numeric enum iteration.** `Object.keys(Priority)` on a 3-variant numeric enum runs **~40× slower** than the same call on a string enum or an equivalent `as const` object (~93 ns vs ~2.5 ns), because numeric enums get the synthesised reverse map (`{0:"Low",1:"Medium",2:"High",Low:0,Medium:1,High:2}`) and `Object.keys` walks all six entries. `Object.entries` is similarly costly (~222 ns vs ~82 ns). if you iterate numeric enums in a hot loop, it adds up — switch to an `as const` object with the same numeric values and the cost drops to the same ~3 ns as any other plain object.

### `as const` is identical to a plain object

stripped of types, the runtime is the same shape:

```ts
const A = { Up: "UP" }; // plain
const B = { Up: "UP" } as const; // type-narrowed, runtime identical
const C = Object.freeze({ Up: "UP" }); // additionally frozen at runtime
```

`as const` is a 100% type-level assertion. it costs nothing at runtime — it just constrains what TypeScript infers.

## tl;dr

### decision tree

- need a runtime object you can iterate / pass around / use for membership checks? → **`as const` object**.
- only type-checking string values? → **string literal union** (zero emit).
- need bit-flag arithmetic or built-in reverse mapping? → **numeric `enum`**. (string enums offer no advantage over `as const`.)
- single-project app, full `tsc` build, never publishing a package? → **`const enum`** is OK, but pays back almost nothing once you bundle. probably not worth it.
- working in a codebase already standardized on one pattern? → keep using it. consistency dominates.

### feature matrix

|                      | runtime object | iterable | `isolatedModules` safe | nominal | emit                             |
| -------------------- | -------------- | -------- | ---------------------- | ------- | -------------------------------- |
| `enum`               | ✓              | ✓        | ✓                      | ✓       | IIFE per declaration             |
| `const enum`         | ✗\*            | ✗        | ✗†                     | ✓       | inlined (whole-program tsc only) |
| string literal union | ✗              | ✗        | ✓                      | ✗       | nothing (type-only)              |
| `as const` object    | ✓              | ✓        | ✓                      | ✗       | plain object literal             |

\* with single-file transpilers, modern esbuild emits the IIFE anyway — defeating the purpose

† works with whole-program `tsc`; per-file transpilers downgrade or break depending on whether the values are reachable

### verdict

backed by actual numbers: **string literal union if you don't need runtime iteration**. **`as const` object if you do**. **numeric `enum` for bit-flags or reverse mapping** — string enums in modern TS are a coin flip with `as const`, pick whichever your team finds more readable. **avoid `const enum`** unless you're 100% on tsc-only, single-project: it either silently downgrades to a regular enum (esbuild) or breaks across package boundaries (ambient `.d.ts`), and the byte savings don't matter after gzip.

the runtime-cost argument that started this whole rabbit hole is a 2-nanosecond distraction. pick on semantics — nominal vs structural, runtime presence vs zero emit — not on benchmark headlines.

---

further reading:

- [TypeScript Handbook: Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
- [tsconfig: isolatedModules](https://www.typescriptlang.org/tsconfig/#isolatedModules)
- [tsconfig: preserveConstEnums](https://www.typescriptlang.org/tsconfig/#preserveConstEnums)
- [TypeScript Playground: enum examples](https://www.typescriptlang.org/play/typescript/language-extensions/enums.ts.html)
