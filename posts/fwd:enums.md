### THIS ARTICLE IS UNDER DEVELOPMENT

# fwd: enums (WIP)

## preface

_should you use enums_ is something that comes up online all the time.
I came up with what I think is a nice name for an article on the topic and decided to investigate it a bit more to answer this question once and for all.

When I started drafting, I didn't expect to change my mind on the topic, but given this some more time it is now more clear that each approach has some benefits and now I have more confidence about what to pick and when.

_I don't think_ this is a definitive answer to _should you use enums_ question - contrary to what I expected before digging the topic - but more like a guide with examples, tests and tips that I discovered around the topic.

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

People call `1` enum tax. but as you will see in [esbuild output](#esbuild), modern compilers handle enum generated IIFE differently - can inline enum values instead of passing whole object around.

For `2` - this is because of a fact, that numeric enums get _reverse mapping_, essentially allowing you to do what's shown at the end of the example.

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

### string literal

### object as const

### const enum

## bench
