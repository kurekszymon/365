# enums-benchmark

Sandbox for the `fwd: enums` article. Compares four TypeScript enum patterns
across bundle size, tree-shaking, runtime iteration cost, and type safety.

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

# mitata runtime benchmark — Object.keys/.values/.entries across patterns
bun run bench

# bundle sizes — minified + gzipped, definition-only and 20-use scenarios,
# const-enum compiled through tsc for a fair "inlined" measurement
bun run sizes

# tree-shaking — what survives when a consumer imports one member.
# Writes intermediate JS to out/tree-shake/ (committed) so the inlined "UP"
# literal can be verified by opening out/tree-shake/enum-minified.js.
bun run treeshake

# typecheck — isolatedModules: true (modern bundler mode)
bun typecheck

# typecheck — isolatedModules: false (whole-program tsc), includes const-enum.ts
bun run typecheck:tsc
```

## hardware + runtime (numbers below were measured on this)

- CPU: Apple M3 (arm64)
- OS: macOS Darwin 25.4.0
- Bun: 1.3.11 (uses **JavaScriptCore**, not V8)

Re-run on different hardware and the absolute numbers shift, but the ratios
between patterns are robust.

## headline results

### bundle sizes — definition only (esbuild)

| pattern                       | raw | min | gzip |
| ----------------------------- | --: | --: | ---: |
| `enum`                        | 739 | 368 |  275 |
| `as const`                    | 374 | 269 |  221 |
| string literal union          | 236 | 176 |  165 |
| `const enum` (via tsc inline) | 564 |  56 |   73 |

### bundle sizes — 20 call sites referencing the pattern

| pattern              |  min | gzip |
| -------------------- | ---: | ---: |
| `enum`               | 1059 |  423 |
| `as const`           | 1020 |  376 |
| string literal union |  827 |  309 |

114 bytes between heaviest and lightest after gzip, over 20 usages. ~6 bytes
per use. choose-your-pattern is not the lever you pull for bundle size.

### tree-shaking — consumer imports one member

| pattern              | bundled | min | gzip |
| -------------------- | ------: | --: | ---: |
| `enum`               |      28 |  19 |   39 |
| `as const`           |     109 |  73 |   93 |
| string literal union |      38 |  19 |   39 |

Surprise: esbuild's enum-aware DCE _wins_ here. The IIFE collapses to a single
inlined string when only one member is referenced. The `as const` object
literal usually survives whole.

### runtime — iteration (ns/op, mitata)

The interesting gap is numeric-enum iteration. The synthesised reverse map
doubles the entry count and tanks `Object.keys`/`entries` performance:

| operation                                  |  ns/op | vs. string enum |
| ------------------------------------------ | -----: | --------------: |
| `Object.keys(stringEnum)` — 4 keys         | 2.3 ns |              1× |
| `Object.keys(numericEnum)` — 6 entries     |  93 ns |             40× |
| `Object.keys(asConstNumeric)` — 3 keys     | 2.5 ns |           ~1.1× |
| `Object.entries(stringEnum)`               |  82 ns |              1× |
| `Object.entries(numericEnum)`              | 222 ns |           ~2.7× |
| `Object.entries(asConstNumeric)`           |  66 ns |           ~0.8× |
| `Object.values(stringEnum)`                |  28 ns |              1× |
| `Object.values(asConstNumeric)`            |  22 ns |           ~0.8× |
| static array ref (string-union DIRECTIONS) | 0.5 ns |            ~55× |

The rest of the call-site operations (property access, equality, switch
dispatch, set lookups) sit in the same ~2–6 ns range on JSC across all
patterns. Not worth measuring at the headline level — pick on semantics.

## reference outputs

The raw clean output (ANSI stripped) of the last canonical run is committed in:

- `.bench-results.txt`
- `.sizes-results.txt`
- `.treeshake-results.txt`

Reproduce by running the scripts above on similar hardware.
