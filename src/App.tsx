import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  ClassCatalog,
  FONT_FAMILIES,
  type FontFamily,
} from "@/components/ClassCatalog";
import { LessonPlayer } from "@/components/LessonPlayer";
import { duneLesson, type LessonDefinition } from "@/presentation";

function classIdFromPath() {
  const match = window.location.pathname.match(/^\/classes\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function storedFontFamily(): FontFamily {
  try {
    const stored = window.localStorage.getItem("rukai.font-family");
    if (FONT_FAMILIES.some(({ value }) => value === stored)) {
      return stored as FontFamily;
    }
  } catch {
    // Keep the default when storage is unavailable.
  }
  return "avenir";
}

function GeneratedLesson({ id, onBack }: { id: string; onBack: () => void }) {
  const generated = useQuery(api.classes.get, { id });
  const logs = useQuery(api.classes.logs, { id });
  const lesson = useMemo<LessonDefinition | null>(() => {
    if (!generated || generated.status !== "ready") return null;
    return {
      id: generated._id,
      title: generated.title,
      summary: generated.summary ?? generated.prompt,
      theme: generated.theme ?? "ember-ocean",
      voices: ["marin"],
      slides: generated.slides.map((slide) => ({
        phase: slide.phase,
        layout: slide.layout,
        tone: slide.tone ?? "dark",
        visualKind: slide.visualKind ?? (slide.imageUrl ? "image" : "list"),
        eyebrow: slide.eyebrow,
        title: slide.title,
        body: slide.body,
        narration: slide.narration,
        content:
          slide.content ??
          slide.facts.map((fact, index) => ({
            label: fact,
            value: String(index + 1).padStart(2, "0"),
            detail: "",
          })),
        facts: slide.facts,
        events: slide.events,
        imageUrl: slide.imageUrl ?? undefined,
        audioByVoice: slide.audioUrl ? { marin: slide.audioUrl } : undefined,
      })),
      metrics: {
        generationDurationMs: generated.generationDurationMs ?? 0,
        totalTokens: generated.totalTokens ?? 0,
        costUsd: generated.costUsd ?? 0,
        models: generated.models ?? [],
        usageEstimated: generated.usageEstimated ?? false,
      },
    };
  }, [generated]);

  if (generated === undefined) {
    return <CenteredMessage title="Cargando clase…" onBack={onBack} />;
  }
  if (generated === null) {
    return <CenteredMessage title="Esta clase no existe" onBack={onBack} />;
  }
  if (lesson) {
    return <LessonPlayer lesson={lesson} onBack={onBack} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#ebe4d5] p-5">
      <section className="w-full max-w-lg rounded-[28px] border border-black/10 bg-[#faf8f2] p-7 shadow-xl">
        <button
          className="text-sm font-semibold text-black/45"
          onClick={onBack}
        >
          ← Todas las clases
        </button>
        <p className="mt-10 text-[10px] font-bold uppercase tracking-[.16em] text-[#b45c2a]">
          {generated.status === "failed"
            ? "Generación detenida"
            : "Generando clase"}
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-.05em]">
          {generated.title}
        </h1>
        <div className="mt-7 rounded-2xl border border-black/10 bg-black/[.025] p-4">
          <ol className="grid gap-3">
            {logs?.map((log, index) => (
              <li
                className={`flex items-center justify-between gap-4 text-sm ${index === logs.length - 1 ? "font-semibold" : "text-black/40"}`}
                key={log._id}
              >
                <span>{log.label}</span>
                <time className="text-xs tabular-nums">
                  +{Math.floor((log.createdAt - generated.createdAt) / 1_000)} s
                </time>
              </li>
            ))}
          </ol>
        </div>
        {generated.error && (
          <p className="mt-4 text-sm leading-relaxed text-red-700">
            {generated.error}
          </p>
        )}
      </section>
    </main>
  );
}

function CenteredMessage({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#ebe4d5] p-5">
      <div className="text-center">
        <h1 className="font-serif text-4xl">{title}</h1>
        <button
          className="mt-5 text-sm font-semibold text-[#a94d20]"
          onClick={onBack}
        >
          Volver a las clases
        </button>
      </div>
    </main>
  );
}

export default function App() {
  const [classId, setClassId] = useState(classIdFromPath);
  const [fontFamily, setFontFamily] = useState(storedFontFamily);

  useLayoutEffect(() => {
    document.documentElement.dataset.fontFamily = fontFamily;
    try {
      window.localStorage.setItem("rukai.font-family", fontFamily);
    } catch {
      // The font still applies for the current session.
    }
  }, [fontFamily]);

  useEffect(() => {
    const updateRoute = () => setClassId(classIdFromPath());
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);

  const navigate = (id: string | null) => {
    const nextPath = id ? `/classes/${encodeURIComponent(id)}` : "/";
    window.history.pushState({}, "", nextPath);
    setClassId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!classId) {
    return (
      <ClassCatalog
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        onOpen={(id) => navigate(id)}
      />
    );
  }
  if (classId === duneLesson.id) {
    return (
      <LessonPlayer
        key={duneLesson.id}
        lesson={duneLesson}
        onBack={() => navigate(null)}
      />
    );
  }
  return (
    <GeneratedLesson key={classId} id={classId} onBack={() => navigate(null)} />
  );
}
