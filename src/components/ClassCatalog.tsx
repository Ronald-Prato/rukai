import {
  ArrowRightIcon,
  CheckIcon,
  Cross2Icon,
  PlusIcon,
  ReloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState, type FormEvent } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

type ClassSummary = Doc<"classes">;

export const FONT_FAMILIES = [
  { value: "avenir", label: "Avenir" },
  { value: "system", label: "Sistema" },
  { value: "editorial", label: "Georgia" },
  { value: "humanist", label: "Optima" },
  { value: "mono", label: "Monoespaciada" },
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number]["value"];

function formatElapsed(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

function GenerationLogs({ lesson }: { lesson: ClassSummary }) {
  const logs = useQuery(api.classes.logs, { id: lesson._id });
  const [, refresh] = useState(0);

  useEffect(() => {
    if (lesson.status === "ready" || lesson.status === "failed") return;
    const timer = window.setInterval(
      () => refresh((value) => value + 1),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [lesson.status]);

  const visibleLogs = logs?.slice(-4) ?? [];
  return (
    <div className="mt-4 rounded-xl border border-black/8 bg-black/[.025] p-3">
      <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[.14em] text-black/40">
        <span>Workflow</span>
        <span>
          {formatElapsed((lesson.completedAt ?? Date.now()) - lesson.createdAt)}
        </span>
      </div>
      <ol className="grid gap-1.5">
        {visibleLogs.length ? (
          visibleLogs.map((log, index) => (
            <li
              className={`flex min-w-0 items-center justify-between gap-3 text-xs ${index === visibleLogs.length - 1 ? "font-semibold text-black/75" : "text-black/38"}`}
              key={log._id}
            >
              <span className="min-w-0 truncate">{log.label}</span>
              <time className="shrink-0 tabular-nums">
                +{formatElapsed(log.createdAt - lesson.createdAt)}
              </time>
            </li>
          ))
        ) : (
          <li className="text-xs text-black/40">{lesson.currentStep}</li>
        )}
      </ol>
    </div>
  );
}

function GeneratedClassCard({
  lesson,
  onOpen,
}: {
  lesson: ClassSummary;
  onOpen: (id: string) => void;
}) {
  const removeClass = useMutation(api.classes.remove);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const status =
    lesson.status === "ready"
      ? "Lista"
      : lesson.status === "failed"
        ? "Con error"
        : lesson.status === "queued"
          ? "En cola"
          : "Generando";

  const confirmDelete = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      await removeClass({ id: lesson._id });
    } catch (caught) {
      setDeleteError(
        caught instanceof Error
          ? caught.message
          : "No pudimos borrar la clase.",
      );
      setDeleting(false);
    }
  };

  return (
    <article className="group relative flex min-h-[270px] flex-col rounded-[24px] border border-black/10 bg-[#faf8f2] p-5 shadow-[0_12px_35px_rgba(67,45,28,.08)]">
      <div
        className={`absolute right-4 top-4 z-10 flex items-center gap-1 bg-[#faf8f2] py-0.5 pl-2 transition-opacity ${confirmingDelete ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"}`}
      >
        {confirmingDelete ? (
          <>
            <span className="mr-1 text-[10px] font-bold text-red-700">
              Confirmar
            </span>
            <button
              className="grid size-8 place-items-center rounded-full bg-red-700 text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-70"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              aria-label="Confirmar borrado de la clase"
            >
              {deleting ? (
                <ReloadIcon className="animate-spin" />
              ) : (
                <CheckIcon />
              )}
            </button>
            <button
              className="grid size-8 place-items-center rounded-full text-black/55 transition hover:bg-black/5 hover:text-black disabled:cursor-not-allowed"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              aria-label="Cancelar borrado"
            >
              <Cross2Icon />
            </button>
          </>
        ) : (
          <button
            className="grid size-8 place-items-center rounded-full text-black/35 transition hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              setDeleteError("");
              setConfirmingDelete(true);
            }}
            aria-label={`Borrar ${lesson.title}`}
          >
            <TrashIcon />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pr-8">
        <span className="rounded-full bg-[#c8672e]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#a94d20]">
          {status}
        </span>
        {lesson.totalTokens !== undefined && (
          <span className="text-[10px] text-black/38">
            {lesson.totalTokens.toLocaleString("es-CO")} tokens
          </span>
        )}
      </div>
      <h2 className="mt-5 font-serif text-3xl leading-[1.02] tracking-[-.04em]">
        {lesson.title}
      </h2>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-black/48">
        {lesson.summary ?? lesson.prompt}
      </p>
      {deleteError && (
        <p className="mt-2 text-xs text-red-700" aria-live="polite">
          {deleteError}
        </p>
      )}
      <GenerationLogs lesson={lesson} />
      {lesson.status === "ready" ? (
        <Button
          className="mt-5 w-full gap-2 rounded-xl"
          onClick={() => onOpen(lesson._id)}
        >
          Ver clase <ArrowRightIcon />
        </Button>
      ) : lesson.status === "failed" ? (
        <p className="mt-4 text-xs text-red-700/70">{lesson.error}</p>
      ) : (
        <div className="mt-5 h-10 animate-pulse rounded-xl bg-black/5" />
      )}
    </article>
  );
}

export function ClassCatalog({
  fontFamily,
  onFontFamilyChange,
  onOpen,
}: {
  fontFamily: FontFamily;
  onFontFamilyChange: (fontFamily: FontFamily) => void;
  onOpen: (id: string) => void;
}) {
  const classes = useQuery(api.classes.list);
  const createClass = useMutation(api.classes.create);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createClass({ prompt });
      setPrompt("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No pudimos crear el job.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2dfbf,transparent_36%),#ebe4d5] px-4 py-8 sm:px-7 sm:py-12">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex items-center justify-between gap-4">
          <strong className="flex items-center gap-2 text-xl tracking-[-.04em]">
            <span className="brand-mark" /> rukai
          </strong>
          <label className="relative">
            <span className="sr-only">Fuente de la plataforma</span>
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-black/35"
              aria-hidden="true"
            >
              Aa
            </span>
            <select
              className="h-10 cursor-pointer appearance-none rounded-full border border-black/10 bg-[#faf8f2]/80 py-0 pl-10 pr-9 text-xs font-semibold text-black/65 shadow-sm outline-none transition hover:border-black/20 hover:bg-[#faf8f2] focus:border-[#c8672e]/45 focus:ring-2 focus:ring-[#c8672e]/20"
              value={fontFamily}
              onChange={(event) =>
                onFontFamilyChange(event.target.value as FontFamily)
              }
            >
              {FONT_FAMILIES.map((font) => (
                <option value={font.value} key={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-black/35"
              aria-hidden="true"
            >
              ▾
            </span>
          </label>
        </header>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b45c2a]">
              Tu biblioteca
            </p>
            <h1 className="mt-4 max-w-3xl text-balance font-serif text-[clamp(3.4rem,7vw,6.8rem)] leading-[.88] tracking-[-.065em]">
              Aprende como si vieras una historia.
            </h1>
          </div>

          <form
            className="rounded-[24px] border border-black/10 bg-[#faf8f2] p-5 shadow-[0_16px_45px_rgba(67,45,28,.09)]"
            onSubmit={(event) => void submit(event)}
          >
            <label className="text-[10px] font-bold uppercase tracking-[.14em] text-black/45">
              Crear una clase desde un prompt
            </label>
            <textarea
              className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-white/70 p-4 text-sm leading-relaxed outline-none transition placeholder:text-black/30 focus:border-[#c8672e]/50 focus:ring-2 focus:ring-[#c8672e]/15"
              placeholder="Ejemplo: Explica la expedición de Magallanes con énfasis en navegación, riesgos y consecuencias."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={2_000}
              required
            />
            {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
            <Button
              className="mt-3 h-11 w-full gap-2 rounded-xl"
              disabled={submitting || prompt.trim().length < 10}
            >
              {submitting ? (
                <ReloadIcon className="animate-spin" />
              ) : (
                <PlusIcon />
              )}
              {submitting ? "Creando job…" : "Generar clase"}
            </Button>
          </form>
        </section>

        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-black/38">
                Clases
              </p>
              <h2 className="mt-1 font-serif text-3xl tracking-[-.04em]">
                Continúa aprendiendo
              </h2>
            </div>
            <span className="text-xs text-black/35">
              {1 + (classes?.length ?? 0)} en la biblioteca
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="relative flex min-h-[270px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#17110c] p-5 text-white shadow-[0_18px_50px_rgba(40,24,13,.2)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,124,61,.3),transparent_42%)]" />
              <div className="relative flex h-full flex-col">
                <span className="w-fit rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#edbd86]">
                  Clase de ejemplo
                </span>
                <h2 className="mt-7 max-w-xs font-serif text-4xl leading-[.96] tracking-[-.05em]">
                  Dune: poder, desierto y destino
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/50">
                  5 diapositivas · Timeline interactivo · Narración en español
                </p>
                <Button
                  className="mt-auto w-full gap-2 rounded-xl bg-[#df7c3d] text-[#160e08] hover:bg-[#ef955b]"
                  onClick={() => onOpen("dune")}
                >
                  Ver clase <ArrowRightIcon />
                </Button>
              </div>
            </article>

            {classes?.map((lesson) => (
              <GeneratedClassCard
                lesson={lesson}
                onOpen={onOpen}
                key={lesson._id}
              />
            ))}

            {classes === undefined &&
              [0, 1].map((item) => (
                <div
                  className="min-h-[270px] animate-pulse rounded-[24px] bg-black/5"
                  key={item}
                />
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
