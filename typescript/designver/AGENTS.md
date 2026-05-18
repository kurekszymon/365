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
