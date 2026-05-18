# shadcn instructions

Use the latest version of Shadcn to install new components, like this command to add a button component:

```bash
pnpm dlx shadcn@latest add button
```

# Component conventions

- One component per file. Do not define multiple exported components in the same file.
- Prefer `const` arrow function declarations over the `function` keyword for components and helpers:

  ```tsx
  // preferred
  export const MyComponent = () => { ... }

  // avoid
  export function MyComponent() { ... }
  ```

# Tests

Playwright is used for e2e tests, Vitest for units.

## Playwright

for playwright, after running test to check if tests failed `test-resuts/.last-run.json` contain info about last run. in `test-results` folder you can find detailed description on why test failed
