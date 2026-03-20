# Learnings

---

## 2026-03-20

### Prisma 7 — migration doesn't regenerate the client
`prisma migrate dev` and `prisma generate` are two separate steps. Ran the migration, got cryptic `Cannot read properties of undefined (reading 'findUnique')` at runtime — turned out the generated client was still pointing at the old schema models. Always run both:
```bash
pnpm prisma migrate dev --name <name>
pnpm prisma generate
```

### Prisma 7 — no more `url` in schema.prisma
`url = env("DATABASE_URL")` in the `datasource` block is gone. It now lives in `prisma.config.ts`. Schema only declares the provider.

### Fastify — plugin registration order matters
If plugin B uses a decoration from plugin A, A must be registered first. Both need to be wrapped with `fastify-plugin` (`fp`) so the decoration escapes encapsulation scope. Spent time debugging `fastify.prisma` being undefined inside the API key plugin — root cause was the generated client being stale, but the pattern to watch out for is: always wrap infrastructure plugins in `fp` and register them before anything that depends on them.

### rrweb — recorder and player are separate packages
`rrweb` (recorder) goes into the tracker bundle. `rrweb-player` goes into the viewer. Don't mix them.
