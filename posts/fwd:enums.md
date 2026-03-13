# fwd: enums (WIP)

## tl;dr

don't need runtime? → **string literal union**. need runtime iteration? → **`as const`** object. skip `const enum` in modern frontend toolchains. regular `enum` only if the codebase already commits to them.

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
enum E { F, G };
// pass it to the function
const f = (e: { F: number; }) => e.F;
f(E);

// iterate over enum (keys|values|entries)
Object.entries(E)

// use reverse mapping like (only for numeric enums)
E[1] // -> 'G'

// note that you wouldn't be able to do that for string enums like
enum A { B = "-B", C = "C-" };
A[1] // -> undefined (no reverse mapping)
```

but of course as it was mentioned you are left with the artifacts, so what are the alternatives?

### `const enum`

unlike a regular `enum`, a `const enum` does not exist at runtime, it is **fully erased** during compilation, so the code above be transpiled down to

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

Modern frontend toolchains (_esbuild_, _swc_, _babel_) have moved to **single-file transpilation**, what means that each `.ts` file is transform independently, without looking at other files.
A single-file transpiler sees `Enumeration.Incomplete` in one file, but it has no idea what value `Incomplete` resolved to, because the enum definition lives elsewhere.

Set `isolatedModules` to true to make TypeScript warn you if you write certain code that can't be correctly interpreted by this single-file transpilation process [(read more in docs)](https://www.typescriptlang.org/tsconfig/#isolatedModules).

If you were to publish a library with ambient enums (produced by `const enum` usage) - consumers of the library won't be able to use `isolatedModules` and those enum values at the same time. Unless you apply same rules as TypeScript project.

TypeScript project itself avoids publishing ambient enums by using [preserveConstEnums](https://www.typescriptlang.org/tsconfig/#preserveConstEnums), emitting `const enums` like regular enums, but inlining them in their own build. [read more about const enums pitfalls](https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls)

but you could simulate them with

### string literal union

Which is the most straight forward way of defining various possibilities with TypeScript.
Instead of definining a separate entity holding the data, you can declare a type alias

```ts
type Kind = 'string' | 'other_string';
const f = (s: Kind) => {}
// or inline it
const f = (s: 'string' | 'other_string') => {}
```

Unlike `const enums` - `string literal union` works with `isolatedModules`.
Similarly to `const enums` it has no runtime, so you cannot iterate over possible values.

Honestly, I don't see many real cons - string unions give you enum-like type checks with zero runtime cost. If you don't inline them, but assign to a type, the intent can be as obvious as for the enum.

If you'd actually need a runtime object that you could derive `string literal union type` from, you can mark your objects

### `as const`

this is where things get interesting. `as const` is a type assertion that tells TypeScript to infer the **narrowest possible type** for a value - making everything `readonly` and literal all the way down.

```ts
const Direction = {
  Up: 'UP',
  Down: 'DOWN',
  Left: 'LEFT',
  Right: 'RIGHT',
} as const;

// derive the union type from the object
type Direction = (typeof Direction)[keyof typeof Direction];
// -> 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
```

what does this buy you? quite a lot actually:

- you get a **runtime object** you can pass around, iterate over, use in lookups
- you get a **derived union type** that works exactly like a string literal union
- it plays nicely with `isolatedModules` - no cross-file resolution needed
- no IIFE, no reverse mapping weirdness - it's just a plain frozen object

```ts
// iterate over values
Object.values(Direction); // ['UP', 'DOWN', 'LEFT', 'RIGHT']

// use as a type
const move = (dir: Direction) => {};
move(Direction.Up);    // ✓
move('UP');            // ✓
move('DIAGONAL');      // ✗ type error

// you can also do arrays
const Roles = ['admin', 'user', 'guest'] as const;
type Role = (typeof Roles)[number];
// -> 'admin' | 'user' | 'guest'

// and now you can check membership at runtime
Roles.includes(someInput as Role);
```

the `typeof X[keyof typeof X]` pattern looks noisy the first time you see it, but it becomes second nature fast. and unlike `enum`, there is no new syntax to learn - it's just JavaScript objects with a type assertion on top.

the tradeoff? you lose the named namespace feel of `Direction.Up` being exclusively tied to the `Direction` enum type. with `as const`, `Direction.Up` and the raw string `'UP'` are interchangeable - TypeScript won't complain about either. depending on your perspective that's a feature (flexibility) or a bug (less nominal typing).

## tl;dr

|                      | runtime object | iteratable | `isolatedModules` | type safety | zero emit |
| -------------------- | -------------- | ---------- | ----------------- | ----------- | --------- |
| `enum`               | ✓              | ✓          | ✓                 | ✓           | ✗         |
| `const enum`         | ✗              | ✗          | ✗*                | ✓           | ✓         |
| string literal union | ✗              | ✗          | ✓                 | ✓           | ✓         |
| `as const` object    | ✓              | ✓          | ✓                 | ✓           | ~✓**      |

\* works with `tsc`, breaks with single-file transpilers unless you jump through hoops

\** emits a plain object literal - minimal, predictable, no IIFE magic

if you don't need runtime iteration - **string literal union**. if you do - **`as const`**. reach for `enum` only when you genuinely need reverse mapping or are in a codebase that already commits to them. avoid `const enum` in anything that touches a modern bundler.
