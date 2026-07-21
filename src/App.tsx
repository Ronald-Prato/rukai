import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";

const starters = [
  { label: "Documento", detail: "PDF, texto o apuntes", icon: "Aa" },
  { label: "Sitio web", detail: "Aprende desde un enlace", icon: "↗" },
  { label: "Tema libre", detail: "Empieza con una idea", icon: "✦" },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const classes = useQuery(api.classes.list);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />

      <main
        className={`min-h-screen transition-[padding] duration-300 ${collapsed ? "md:pl-[76px]" : "md:pl-60"}`}
      >
        <header className="flex h-16 items-center justify-between border-b border-border/70 px-5 md:px-10">
          <button
            className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground md:hidden"
            onClick={() => setCollapsed(false)}
            aria-label="Abrir menú"
          >
            <span className="brand-mark brand-mark-small" aria-hidden="true" />
            rukai
          </button>
          <span className="hidden text-sm text-muted-foreground md:block">
            Tu estudio de aprendizaje
          </span>
          <Button variant="outline" size="sm" className="gap-2 bg-card/70">
            <MagnifyingGlassIcon />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden rounded border border-border bg-background px-1.5 text-[10px] text-muted-foreground lg:inline">
              ⌘ K
            </kbd>
          </Button>
        </header>

        <section className="workspace-grid px-5 py-12 sm:px-8 md:px-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Estudio
              </p>
              <h1 className="text-balance text-4xl font-medium tracking-[-0.045em] text-foreground sm:text-5xl md:text-6xl">
                Convierte cualquier tema en una clase viva.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Reúne tus fuentes y deja que Rukai las transforme en una
                experiencia clara, visual e interactiva.
              </p>
              <Button size="lg" className="mt-8 gap-2 rounded-full px-6 shadow-none">
                <PlusIcon /> Nueva clase
              </Button>
            </div>

            <div className="mt-16 grid gap-3 sm:grid-cols-3">
              {starters.map((starter) => (
                <button
                  key={starter.label}
                  className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card/75 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-semibold text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                    {starter.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      {starter.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {starter.detail}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <section className="mt-20" aria-labelledby="recent-title">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Biblioteca
                  </p>
                  <h2 id="recent-title" className="mt-2 text-2xl font-medium tracking-tight">
                    Clases recientes
                  </h2>
                </div>
                <Button variant="ghost" size="sm">Ver todas</Button>
              </div>

              <div className="rounded-3xl border border-dashed border-border bg-card/45 px-6 py-12 text-center sm:px-10">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                  ✦
                </span>
                <h3 className="mt-4 text-base font-medium">
                  {classes?.length ? `${classes.length} clases listas` : "Tu primera clase empieza aquí"}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {classes?.length
                    ? "Continúa donde lo dejaste desde tu biblioteca."
                    : "Añade una fuente o escribe un tema. Rukai organizará el resto contigo."}
                </p>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
