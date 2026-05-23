### THIS ARTICLE IS UNDER DEVELOPMENT

# fwd: enums (WIP)

## preface

_should you use enums_ is something that comes up online all the time.
I came up with what I think is a nice name for an article on the topic and decided to investigate it a bit more to answer this question once and for all.

When I started drafting, I didn't expect to change my mind on the topic, but given this some more time it is now more clear that each approach has some benefits and now I have more confidence about what to pick and when.

Is this a definitive answer to _should you use enums_ question? Contrary to what I expected before researching it - I don't know. There are tools that produce different output given same input. Modern bundlers give you optimizations old ones didn't. I think you should use enums, so `fwd:enums` to your colleague, and let me know what is _your_ opinion on the matter.

## contenders

Let's take a look at possible ways to declare finite set of named constants (enum-like structures)

### enum

~~Just~~ regular enum.

```ts
enum Direction {
  Up = 25, // initializer, start incrementing from 25.
  Down,
  Left,
  Right,
}

enum Direction {
  Up, // no initializer, start incrementing from 0
  Down,
  Left,
  Right,
}

// --- STRING ENUMS ---

enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}
```

I purposefully marked a difference between NUMERIC and STRING enums, since there are some differences in how they are handled behind the scenes.

Consider this TSC Output for cases above. Right away you can notice _two_ major things.

1. Enums are not transpiled to regular js object, but an IIFE.
2. Numeric enums have one more assignment round trip.

People call the first one an enum tax. but as you will see in [esbuild / rolldown output](#bench), modern compilers handle enum generated IIFE differently - can inline enum values instead of passing whole object around.

For the second one - this is because of a fact, that numeric enums get _reverse mapping_, essentially allowing you to do what's shown at the end of the example.

```ts
// --- STRING ENUMS ---
var Direction;
(function (Direction) {
  Direction["Up"] = "UP";
  Direction["Down"] = "DOWN";
  Direction["Left"] = "LEFT";
  Direction["Right"] = "RIGHT";
})(Direction || (Direction = {}));

// NUMERIC ENUMS
var Direction;
(function (Direction) {
  Direction[(Direction["Up"] = 25)] = "Up";
  Direction[(Direction["Down"] = 26)] = "Down";
  Direction[(Direction["Left"] = 27)] = "Left";
  Direction[(Direction["Right"] = 28)] = "Right";
})(Direction || (Direction = {}));

const DOWN = Direction.Down;
Direction[DOWN];
```

[TS Playground link](https://www.typescriptlang.org/play/?#code/KYOwrgtgBAIglgJ2AYwC5wPYigbwFBRQCqADlALxQBERAClQDQGwYDu2lVMA8gOoByjZgBlgAM1QVqwgKIAxACpDCAJTgBzABaTOKgJIBxABJKmAXzx5QkWIhToswXM1JSATAFYGUAPQ+ocCBw6ACGADZwAF7ACN4AzqghCJKByEgQoOgg6lBiCBjQngB0zDBsIEyEohKVUGpaqOaWyFgJsHz8UvBIaJggwEVl7Hjd9n3AANo8AgC6QA)

Read more:

- [enums at runtime](https://www.typescriptlang.org/docs/handbook/enums.html#enums-at-runtime)
- [reverse mapping](https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings)

### const enum

or something that on paper seems like an obvious pick, but it's really not..?
Consider following example (compiled with `tsc`)

```ts
const enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

const direction = Direction.Down;

// would be transformed to

const direction = "DOWN"; /* ConstDirection.Down */
```

[TS Playground Link](https://www.typescriptlang.org/play/?#code/MYewdgzgLgBApmArgWxgYXNAIgSwE5zBQ7gwDeAUDDAKoAOMAvDAEQ0AKLANFTFiAHcwTVlgDyAdQBy3XgBk4AM1jMWcgKIAxACqzqAJRwBzABYrW+gJIBxABK6eAXwoVQkWABN8hYqWYZ3XAIiEjAAOn4hIA)

Interestingly **const enum pitfalls** section in TS docs is longer than **const enum** section itself, highly recommend digging into that, but in short:

`const enum` **is not** the best pick when you are **not** using `tsc` or you have `isolatedModules: true` in your _tsconfig.json_. That's because modern transpilers operate on a single file at a time - what means that each `.ts` file is transformed independently, without looking at other files.
A single-file transpiler sees `Direction.Down` in one file, but it has no idea what value `Down` resolved to, because the enum definition lives elsewhere - since `const enum` is inlined to JS value - using it with `isolatedModules` will result in an error of referencing ambient enum.

Because of that `const enum` **is not** treated as object on runtime, it is only possible to use it in property or
index access.

As mentioned in previous section - [you'll see](#bench) that using `esbuild` or `rolldown` allows you to inline enum values basically replicating `const enum` desired behavior without the pitfalls.

Read more:

- [const enum pitfalls](https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls)
- [isolatedModules](https://www.typescriptlang.org/tsconfig/isolatedModules.html)

### type union

completely stripped at compilation, type safety with no const at runtime.

```ts
const str: "1" | "2" = "1";

function fn(arg: "1" | "2") {
  void (arg == "3");
  // ^ This comparison appears to be unintentional because the types '"1" | "2"' and '"3"' have no overlap.(2367)
}

const num: 1 | 2 = 1;

function fnum(arg: 1 | 2) {
  void (arg == 2);
}

const obj: { prop: "val" } | { prop2: "val2" } = { prop: "val" };

function fobj(arg: { prop: true } | { prop2: false }) {
  if ("prop" in arg) {
    arg.prop;
  } else {
    arg.prop2;
  }
}

// --- WOULD PRODUCE ---

const str = "1";
function fn(arg) {
  void (arg == "3");
}
const num = 1;
function fnum(arg) {
  void (arg == 2);
}
const obj = { prop: "val" };
function fobj(arg) {
  if ("prop" in arg) {
    arg.prop;
  } else {
    arg.prop2;
  }
}
```

[TSC Playground Link](https://www.typescriptlang.org/play/?#code/MYewdgzgLgBNBOAuGByAjCmAfVAmTAvKhgFAkBmArmMFAJbgzlgAUAhvAObLqY4r4AlDADeJGDABuIOgBMY7LjAJEUAZhSCA3CQC+ZUJFhhKAW2RpsMXMphoyVGvUbMzi7nau5hYidLkKHJzKRN56BuDQMCAARgBWyCIADvAgSTySbAA2KLpWyalJuBnZ+HlEBWklOfoU1LQMYEyxce6JKVUwUPCUAKZ5OJVFyOTZEP0+4jB05AooHUmYdE1BkxISQQB0C1N5vVnjolMbXNuFuLt6QA)

note that there is no weirdness, no IIFE, typescript syntax is removed, so all the type checks are done during the compilation and you are left with no runtime code.

On top of what you get from this, you can (of course) extract and share your types in the app and use utility types.

```ts
type Str = "1" | "2";
const str: Str = "1";

function fn(arg: Str) {
  void (arg == "3");
}

type Num = 1 | 2;
const num: Num = 1;

function fnum(arg: Num) {
  void (arg == 2);
}

type Obj =
  | { prop?: boolean; status: boolean }
  | { prop2?: boolean; status: boolean };

const obj: Obj = { prop: true, status: true, prop2: true };

function fPick(arg: Pick<Obj, "status">) {
  arg.status;
}

function fOmit(arg: Omit<Obj, "status">) {
  arg.status;
  // ^ Property 'status' does not exist on type 'Omit<Obj, "status">'.(2339)
}

// WOULD PRODUCE

const str = "1";
function fn(arg) {
  void (arg == "2");
}
const num = 1;
function fnum(arg) {
  void (arg == 2);
}
const obj = { prop: true, status: true, prop2: true };
function fPick(arg) {
  arg.status;
}
function fOmit(arg) {
  arg.status;
}
```

[Typescript Playground Link](https://www.typescriptlang.org/play/?#code/C4TwDgpgBAysBOUC8UDkBGVUA+aBMqAUAMYD2AdgM7BTXwBcsCyamhhAZgK7nHACWFKB3IAKAIbwA5ozjwAlFADehKFABupfgBMoE6chSoC8gNyEAvu1CQoAOS4BbFuhxQ8JCtSjknjB84o6OzcvAJCIk76MvZOiipqmjp6klKG7vKW1uDQAPIARgBWLEpg8KRgAPyM+aSkADYQ4uQANLTA4sBclDV1jc0WbqXlYHjVULUNTa3tnd29UwPsZFQ0pEWMBcUowxWMCFwQbdRzPVAHR1BlFXj78IdWnDx8guTCAAr8xADW0YyfPwAPFs2qgTl1KKgAHzxVRQVIAOnB3SyTzCr2EuUc-GAfygWJxwKKoORkJhyjhiNJliAA)

It's great, it's free, it's type union.

Read more:

- [working with union types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#working-with-union-types)
- [use union types](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#use-union-types)
- [discriminated unions](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions)
- [utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

### object as const

## sum (or sth)

If you **do** need runtime:
I think enums are great for showing intent of enumerable values. They are well optimized in modern bundlers so it's safe to use them and send a clear message about the intent.

If you **don't need** runtime, but just want to ensure type safety for your arguments or variables - type union is a great and truly cost free tool to use.

Avoid `const enum` if you are not using `tsc` exclusively. With modern bundlers [covered here](#bench), regular enum is inlined the same way as `const enum` would be.

## bench

referenced three times already, need to really show that esbuild inlines enum properly :D

Read more:

- https://esbuild.github.io/api/#tree-shaking
- https://esbuild.github.io/api/#ignore-annotations
- https://esbuild.github.io/api/#pure
