<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Project rules

- Use Bun exclusively for package installation and scripts.
- Prefer the smallest viable diff and reuse existing code before adding files.
- Keep components focused and shared UI in `src/components/`.
- Treat responsive behavior and bundle size as first-class requirements.
- Every clickable control must use a pointer cursor.
- Record recurring defects and their prevention in `KNOWN_PITFALLS.md`.
