# Rukai

Generador de clases interactivas con IA construido con React, Vite, TypeScript, Tailwind, shadcn/ui y Convex.

## Desarrollo

```bash
bun install
bun run dev
```

El comando inicia Vite y sincroniza el backend de desarrollo de Convex. Las variables locales viven en `.env.local` y no se versionan.

## Verificación

```bash
bun run lint
bun run build
bunx convex dev --once --typecheck enable
```
