# Known pitfalls

- Use `bun`, `bun run`, and `bunx` only; do not introduce npm or pnpm lockfiles.
- Read `convex/_generated/ai/guidelines.md` before changing backend code.
- A Convex project and deployment are separate resources; create and select both before running `convex dev --once`. The reference `dev` is reserved, so use a name such as `development`.
- Keep `.env.local` private. Vite only exposes variables prefixed with `VITE_` to the client.
- Interactive controls need visible focus states, pointer cursors, and mobile-sized hit areas.
