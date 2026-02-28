# fwd: enums

## tl;dr

to be filled

## preface

the **_enums vs string literals_** is one of those internet rabbit holes\*

there is a lot of discussion\* going on over the internet over enums vs string literals and what to use and what not to use.

Few years back my friend planted a seed of doubt during pair programming, that made me stop at every enum I see. Some time ago, while interviewing for a frontend role, I found myself passing that same seed along.
I want to get this finally sorted so..

I came up with a fancy name of `fwd: enums` - consider this definitive research piece you can forward next time someone tells you to swap your enum for a string union in your pr.

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

It's all about the output produced by the compiler - enums in TypeScript are _not_ removed during compilation. They are still there at runtime, compiled down to an IIFE to create an object.
Every usage, like `MicCheck.One` becomes a property lookup on that object at runtime.

```ts
// tsc output
var MicCheck;
(function (MicCheck) {
  MicCheck[(MicCheck["One"] = 0)] = "One";
  MicCheck[(MicCheck["Two"] = 1)] = "Two";
})(MicCheck || (MicCheck = {}));

var assignment = MicCheck.One;
```

It's not a big cost if it's a single enum, or few smaller ones, but the more enums in the code - more resources consumed at runtime.

However, for the cost of runtime presence you can

- iterate over the object `Object.entries(MicCheck)`
- access it, by index like `MicCheck[0] // -> 'One'`

but what are the alternatives?

### `const enum`

it is possible to inline an enum with `const` prefix, like

```ts
const enum Enumeration {
  Proper,
  Incomplete,
}

const assignment = Enumeration.Incomplete;
```

and unlike a regular `enum`, a `const enum` does not exist at runtime, it is **fully erased** during compilation, the code above would compile down to

```ts
var assignment = 1; /* Enumeration.Incomplete */
```

so there is no object, no IIFE, no runtime lookup, no emitted code for the enum itself, and you get full type safety and a helpful comment left behind for readability. TypeScript still enforces the enum type, just doesn't emit it.

no runtime presence however makes you lose index access - `error TS2476: A const enum member can only be accessed using a string literal.` and the ability to iterate over enum values.

#### when `const enum` works

inlining a `const enum` requires the compiler to see the **full program** - it needs to resolve enum values at every usage site. This works when you compile your program with `tsc`, even if bundler handles the rest (`tsc` emits JS, `webpack`/`rollup` bundles it).

you could make use of it in

- `node.js` backends
- internal tooling / scripts / CLIs
- any project compiled with `tsc`

#### when `const enum` breaks

Modern frontend toolchains (_esbuild_, _swc_, _babel_, or _isolatedModules: true_) have moved to **single-file transpilation**, what means that each `.ts` file is transform independently, without looking at other files.
A single-file transpiler sees `Enumeration.Incomplete` in one file, but it has no idea what value `Incomplete` resolved to, because the enum definition lives elsewhere.

Same goes for publishing a library, however in this case you don't control your consumers' tooling, so you cannot safely assume proper handling of ambient enums.

TypeScript project itself avoids publishing ambient enums by using [preserveConstEnums](https://www.typescriptlang.org/tsconfig/#preserveConstEnums), emitting `const enums` them like regular enums, but inlining them in their own build. [read more about const enums pitfalls](https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls)

### string literal union

### `as const` object
