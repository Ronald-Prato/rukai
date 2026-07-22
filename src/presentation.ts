export const voices = ["marin", "cedar", "coral"] as const;

export type Voice = (typeof voices)[number];

export type PresentationEvent = {
  id: string;
  at: number;
  label: string;
  kind?: "reveal" | "interaction";
};

export type LessonTheme = "ember-ocean" | "plum-sage" | "cobalt-sand";
export type SlideTone = "dark" | "light" | "accent" | "muted";
export type VisualKind =
  | "image"
  | "list"
  | "stats"
  | "chart"
  | "table"
  | "diagram";

export type SlideContentItem = {
  label: string;
  value: string;
  detail: string;
};

export type PresentationSlide = {
  phase?: "intro" | "topic";
  layout?: "hero" | "split" | "focus" | "cards" | "chain";
  tone?: SlideTone;
  visualKind?: VisualKind;
  eyebrow: string;
  title: string;
  body: string;
  narration: string;
  content?: readonly SlideContentItem[];
  facts?: readonly string[];
  imageUrl?: string;
  audioByVoice?: Readonly<Record<string, string>>;
  events: readonly PresentationEvent[];
};

export type LessonMetrics = {
  generationDurationMs: number;
  totalTokens: number;
  costUsd: number;
  models: readonly string[];
  usageEstimated: boolean;
};

export type LessonDefinition = {
  id: string;
  title: string;
  summary: string;
  theme: LessonTheme;
  voices: readonly string[];
  slides: readonly PresentationSlide[];
  metrics: LessonMetrics;
};

export const slides = [
  {
    eyebrow: "Dune · Frank Herbert",
    title: "Bienvenido a Arrakis",
    body: "Un planeta imposible. Una familia recién llegada. Un recurso capaz de sostener todo un imperio.",
    narration:
      "Bienvenido a Arrakis, el corazón de Dune, la primera novela de Frank Herbert. Imagina un planeta casi enteramente desértico, donde el agua vale más que cualquier tesoro y cada decisión puede cambiar el destino de un imperio.",
    events: [
      { id: "eyebrow", at: 0, label: "Tema" },
      { id: "title", at: 0.7, label: "Título" },
      { id: "body", at: 3, label: "Introducción" },
    ],
  },
  {
    eyebrow: "La premisa",
    title: "Una herencia que es también una trampa",
    body: "La Casa Atreides recibe el control de Arrakis. Paul llega con su familia a un mundo atravesado por política, religión y ecología.",
    narration:
      "La historia comienza cuando la Casa Atreides recibe el control de Arrakis. Paul Atreides llega junto a su familia, pero el nombramiento es también una trampa política. Desde ese momento, poder, religión y supervivencia quedan unidos al desierto.",
    events: [
      { id: "eyebrow", at: 0, label: "Premisa" },
      { id: "title", at: 0.8, label: "Título" },
      { id: "body", at: 2.8, label: "Contexto" },
      { id: "chips", at: 5.5, label: "Claves" },
      { id: "visual", at: 7.5, label: "Arrakis" },
    ],
  },
  {
    eyebrow: "Antes de entrar al desierto",
    title: "Nada en Dune existe de forma aislada",
    body: "Personas, profecías, recursos y ecosistemas forman una sola red de consecuencias.",
    narration:
      "Esa es la idea que nos guiará: en Dune, nada existe de forma aislada. Las personas transforman el ambiente y el ambiente transforma a las personas. ¿Estás listo para descubrir cómo funciona este mundo?",
    events: [
      { id: "eyebrow", at: 0, label: "Idea" },
      { id: "title", at: 0.8, label: "Título" },
      { id: "body", at: 3, label: "Consecuencia" },
      { id: "visual", at: 5.5, label: "Red" },
      { id: "interaction", at: 11, label: "Tu turno", kind: "interaction" },
    ],
  },
  {
    eyebrow: "Tema · La especia",
    title: "Melange: el recurso más valioso",
    body: "La especia prolonga la vida, expande la consciencia y permite a los navegantes de la Cofradía cruzar el espacio.",
    narration:
      "Empecemos con la especia melange. Solo se encuentra en Arrakis. Puede prolongar la vida y expandir la consciencia, pero su función más importante es permitir que los navegantes de la Cofradía guíen los viajes interestelares. Sin especia, el imperio deja de moverse.",
    events: [
      { id: "eyebrow", at: 0, label: "Tema" },
      { id: "title", at: 0.8, label: "Melange" },
      { id: "body", at: 3.2, label: "Función" },
      { id: "visual", at: 5.8, label: "Especia" },
      { id: "nodes", at: 8, label: "Efectos" },
    ],
  },
  {
    eyebrow: "Una cadena de poder",
    title: "Quien controla Arrakis controla el movimiento",
    body: "Herbert convierte un recurso natural en el centro de una red económica, política y ecológica.",
    narration:
      "Aquí aparece una de las ideas centrales del libro. El desierto produce la especia; la Cofradía depende de ella; y el imperio depende de la Cofradía. Por eso, controlar Arrakis significa controlar el movimiento, el comercio y el poder. La ecología del planeta termina ordenando toda la política humana.",
    events: [
      { id: "eyebrow", at: 0, label: "Cadena" },
      { id: "title", at: 0.8, label: "Título" },
      { id: "body", at: 3.2, label: "Idea central" },
      { id: "card-0", at: 5.5, label: "Desierto" },
      { id: "card-1", at: 7, label: "Especia" },
      { id: "card-2", at: 8.5, label: "Cofradía" },
      { id: "card-3", at: 10, label: "Imperio" },
    ],
  },
] as const satisfies readonly PresentationSlide[];

export function narrationUrl(slideIndex: number, voice: Voice) {
  return `/narrations/${voice}/slide-${slideIndex + 1}.mp3`;
}

const DUNES =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Dune%20-%20panoramio%20%281%29.jpg?width=1800";
const duneLayouts = ["hero", "split", "focus", "cards", "chain"] as const;
const duneTones = ["dark", "light", "accent", "muted", "dark"] as const;
const duneVisuals = ["image", "list", "chart", "stats", "table"] as const;
const duneFacts = [
  ["Agua escasa", "Planeta desértico", "Destino imperial"],
  ["Casa Atreides", "Arrakis", "Trampa política"],
  ["Personas", "Ecología", "Consecuencias"],
  ["Vida", "Consciencia", "Viaje"],
  ["Desierto", "Especia", "Cofradía", "Imperio"],
] as const;

export const duneLesson: LessonDefinition = {
  id: "dune",
  title: "Dune: poder, desierto y destino",
  summary:
    "Una introducción narrada al primer libro de Frank Herbert y a la cadena de poder creada por la especia.",
  theme: "ember-ocean",
  voices,
  slides: slides.map((slide, index) => {
    const facts = duneFacts[index];
    const events: PresentationEvent[] = [];
    for (const event of slide.events) {
      if (event.id === "chips" || event.id === "nodes") {
        events.push(
          ...facts.map((_, factIndex) => ({
            ...event,
            id: `fact-${factIndex}`,
            at: event.at + factIndex * 0.45,
          })),
        );
        continue;
      }
      if (event.id.startsWith("card-")) {
        events.push({ ...event, id: event.id.replace("card-", "fact-") });
        continue;
      }
      events.push(event);
    }
    return {
      ...slide,
      events,
      phase: index < 3 ? "intro" : "topic",
      layout: duneLayouts[index],
      tone: duneTones[index],
      visualKind: duneVisuals[index],
      facts,
      content: facts.map((fact, factIndex) => ({
        label: fact,
        value:
          index === 2
            ? (["35", "72", "100"][factIndex] ?? "0")
            : index === 3
              ? (["+vida", "visión", "viaje"][factIndex] ?? "clave")
              : String(factIndex + 1).padStart(2, "0"),
        detail:
          index === 4
            ? "Cada eslabón depende del anterior."
            : "Idea clave de la explicación.",
      })),
      imageUrl: index === 0 ? DUNES : undefined,
      audioByVoice: Object.fromEntries(
        voices.map((voice) => [voice, narrationUrl(index, voice)]),
      ),
    };
  }),
  metrics: {
    generationDurationMs: 10 * 60 * 1_000,
    totalTokens: 7_000,
    costUsd: 0.071,
    models: ["gpt-4o-mini-tts"],
    usageEstimated: true,
  },
};

export function visibleEventIds(
  events: readonly PresentationEvent[],
  currentTime: number,
) {
  return new Set(
    events.filter((event) => event.at <= currentTime).map((event) => event.id),
  );
}

export function clampSeekTime(
  requestedTime: number,
  maxReachedTime: number,
  duration: number,
) {
  return Math.max(0, Math.min(requestedTime, maxReachedTime, duration));
}

export function canContinueFromInteraction(
  narrationFinished: boolean,
  interactionAnswered: boolean,
) {
  return narrationFinished && interactionAnswered;
}

export function formatPlaybackTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
