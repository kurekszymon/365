# enums-benchmark

Sandbox for the `fwd: enums` article. Compares four TypeScript enum patterns across bundle size, runtime performance, and type safety.

## patterns

| file                           | pattern                          |
| ------------------------------ | -------------------------------- |
| `src/patterns/enum.ts`         | regular `enum`                   |
| `src/patterns/const-enum.ts`   | `const enum`                     |
| `src/patterns/string-union.ts` | string literal union             |
| `src/patterns/as-const.ts`     | `as const` object + derived type |

## commands

```sh
bun install

# runtime benchmark — ns/op for property access, equality, iteration, membership check
bun run bench

# bundle size — minified byte count per pattern via esbuild
bun run sizes

# typecheck with isolatedModules: true (modern bundler mode)
# excludes const-enum.ts — single-file transpilers can't inline cross-file const enums
bun typecheck

# typecheck with isolatedModules: false (full tsc compilation)
# includes const-enum.ts — tsc can resolve and inline const enum values
bun run typecheck:tsc
```

## const enum and isolatedModules

`const enum` compiles fine when tsc sees the whole program (`isolatedModules: false`). The problem arises with single-file transpilers (esbuild, swc, babel): they transform each `.ts` file independently. When they encounter `Direction.Up` imported from another file's `const enum`, they have no idea what value to inline — they can't see the definition.

The result is a **runtime error**: the runtime object doesn't exist (const enum has no emit), so the property lookup returns `undefined`.

TypeScript warns about this when you set `isolatedModules: true` — but only for **ambient** const enums (from `.d.ts` files / library types). For same-project const enums, the isolation problem is a bundler-level footgun rather than a compile-time error.

## results (measured on Apple M-series)

### bundle sizes (minified)

| pattern        | bytes                                            |
| -------------- | ------------------------------------------------ |
| `enum`         | 368                                              |
| `string-union` | 176                                              |
| `as-const`     | 269                                              |
| `const enum`   | ~0 (inlined by tsc, not measurable with esbuild) |

The string-union size includes the `DIRECTIONS` array and `isDirection` guard function. The type alias itself emits zero bytes.

### runtime (5M iterations, ns/op)

| operation               | enum  | as const | string union        |
| ----------------------- | ----- | -------- | ------------------- |
| property access         | 2.29  | 1.22     | 1.12 (raw)          |
| equality check          | 1.23  | 2.16     | 2.95                |
| Object.values iteration | 27.21 | 26.17    | 1.67 (array.length) |
| membership check        | 28.30 | 29.23    | 8.27                |

All property access and equality checks are in the 1–3 ns range — not a meaningful difference. The iteration and membership gaps reflect `Object.values()` allocating a new array on every call vs a pre-existing frozen array.

### some more stuff

asked claude to squeeze the shit out of `enums` vs `as const` and `string literal` and here's the summary

will be posted on branch posts/enum-bench-ext

- Object.keys(numericEnum) is 26x slower than string enum (91 ns vs 3.56 ns) — numeric enums have 6 keys due to reverse mapping ([0, 1, 2, "Low", "Medium", "High"]), which completely ruins enumeration
- Object.entries is similarly brutal for numeric enums: 235 ns vs 83 ns for string enum / as const
- inline OR chain (v === "UP" || v === "DOWN" || ...) is the fastest membership check at 2.5 ns — faster than even a precomputed Set.has (9.85 ns), because there's zero indirection
- Precomputed Set.has is identical across all three patterns (~9.83 ns each) — the pattern you pick has zero effect once you cache it
- Symbol as const got JIT-eliminated entirely — mitata flagged it and printed nothing in the summary, meaning V8 constant-folded all Symbol operations as dead code in isolation
- as const and plain object are runtime-identical — same 2.89 ns; the as const assertion is 100% type-level, zero cost
- Per-call new Map(...) costs ~107 ns; cached .get() is ~10 ns — 10x difference, always cache lookup maps
- Reverse mapping: Priority[1] is 2.88 ns built-in; replicating it with a cached Map costs 3.26 ns — nearly equal; doing it per-call is 153 ns (don't)
