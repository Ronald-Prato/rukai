"use node";

import OpenAI, { toFile } from "openai";
import { internal } from "./_generated/api";
import { env, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  synchronizeEvents,
  type AuthoredEvent,
  type EventAlignment,
} from "./synchronizeEvents";

const TEXT_MODEL = "gpt-5.4-mini";
const IMAGE_MODEL = "gpt-image-2";
const SPEECH_MODEL = "gpt-4o-mini-tts";
const TRANSCRIPTION_MODEL = "whisper-1";
const VOICE = "marin";
const SLIDE_COUNT = 5;
const MAX_AUTHORING_ATTEMPTS = 3;
const MAX_ALIGNMENT_ATTEMPTS = 2;
const TITLE_WORD_LIMIT = 12;
const BODY_WORD_LIMIT = 40;
const LESSON_THEMES = ["ember-ocean", "plum-sage", "cobalt-sand"] as const;
type LessonTheme = (typeof LESSON_THEMES)[number];

// Standard API rates verified against OpenAI's pricing page on 2026-07-21.
const RATES = {
  textInput: 0.75 / 1_000_000,
  textCachedInput: 0.075 / 1_000_000,
  textOutput: 4.5 / 1_000_000,
  imageTextInput: 5 / 1_000_000,
  imageOutput: 30 / 1_000_000,
  speechTextInput: 0.6 / 1_000_000,
  speechAudioOutput: 12 / 1_000_000,
  transcriptionMinute: 0.006,
} as const;

export const LESSON_SYSTEM_PROMPT = `Eres el agente de autoría de Rukai. Diseñas clases visuales, narradas, interactivas y adaptables en español latino neutro.

Principios de la clase:
- Produce exactamente cinco diapositivas: una introducción, tres de contenido principal y un cierre.
- La clase debe sentirse como una presentación guiada que avanza como un video, no como texto repartido en tarjetas.
- Cada diapositiva combina una escena visual, un fragmento de narración y apariciones coherentes con lo narrado.
- La introducción termina con una invitación breve a comenzar. Decide libremente cómo formularla y cómo nombrar el CTA; evita repetir mecánicamente "¿estás listo para...?". interaction.kind debe ser ready y su prompt debe aparecer con la misma redacción dentro de narration.
- Las tres diapositivas de contenido desarrollan una secuencia pedagógica coherente. La última termina con una pregunta que comprueba comprensión y usa interaction.kind single_choice, true_false o multiple_choice.
- El enunciado completo de esa pregunta debe aparecer con la misma redacción dentro de narration para que Rukai lo sincronice con el audio. single_choice tiene cuatro opciones y una correcta; true_false tiene exactamente Verdadero y Falso; multiple_choice tiene cuatro opciones y entre dos y tres correctas.
- La diapositiva final cierra el tema sin pedir una nueva respuesta. Rukai mostrará después el feedback de la pregunta contestada.
- Las listas, datos, tablas, diagramas, imágenes y vectores deben aclarar lo narrado; nunca son decoración gratuita.
- La narración debe sonar cálida, clara, pedagógica y cinematográfica, con pausas naturales.
- El estudiante debe poder retroceder en el tiempo: por eso toda aparición se expresa como un evento declarativo vinculado al audio real.
- La experiencia completa, incluida la interacción, debe estar en español.

Dirección visual obligatoria:
- Evita una secuencia monótona de título grande, descripción pequeña e imagen. Cada slide debe tener una jerarquía y una composición realmente distinta.
- Usa los cinco layouts exactamente una vez. Cambia la posición del título: puede ir arriba, centrado, junto al recurso, integrado en una retícula o funcionar como una frase breve.
- Usa exactamente la theme que el sistema asigna al azar para toda la clase y alterna al menos tres tones. Los tones adyacentes no pueden repetirse; deben sentirse complementarios dentro de la misma paleta.
- Prioriza siempre contrastes fuertes y legibilidad inmediata. El texto principal y secundario debe usar una tinta clara u oscura que contraste claramente con el fondo; reserva los colores complementarios de menor contraste para vectores y decoración, nunca para información esencial.
- Usa como máximo dos imágenes en toda la clase. Las demás slides deben representar información mediante listas, estadísticas, gráficas, tablas pequeñas o diagramas; combina al menos cuatro visualKind distintos en total.
- Cuando no haya imagen, la composición debe apoyarse en datos y vectores decorativos simples, no dejar un hueco reservado para una foto.
- Toda lista debe mostrarse en una sola columna vertical. Nunca conviertas una lista en chips, etiquetas, tarjetas en fila ni una cuadrícula horizontal.
- Evita al máximo encerrar contenido en contenedores con bordes, cápsulas o tarjetas repetidas. Prioriza espacio en blanco, alineación, jerarquía tipográfica, líneas abiertas y separadores discretos; usa un contenedor solo cuando aporte significado funcional claro.
- Los títulos tienen máximo nueve palabras. El body tiene máximo 32 palabras y puede ser una cadena vacía cuando el contenido estructurado explica mejor la idea.
- content contiene entre dos y cuatro elementos. Para list usa label y detail; para stats usa value como cifra y label como nombre; para chart usa value como entero entre 0 y 100; para table usa label y value como celdas; para diagram usa label como nodo y value como relación breve. Usa una cadena vacía en campos que no apliquen.
- imagePrompt debe estar vacío si visualKind no es image. Si es image, describe una sola ilustración editorial horizontal sin texto, logotipos ni marcas de agua y alineada con la theme elegida.

Contrato de salida:
- theme es una de ember-ocean, plum-sage o cobalt-sand.
- slides[0].phase = "intro", slides[1..3].phase = "content" y slides[4].phase = "closing".
- Todas las slides incluyen interaction. En slides sin interacción usa kind none y deja prompt, ctaLabel y explanation vacíos y los arreglos vacíos.
- En la intro, interaction usa kind ready, prompt y ctaLabel naturales, y los arreglos vacíos.
- En la tercera slide de contenido, interaction contiene la pregunta, sus opciones, correctOptionIndexes y una explicación breve para el feedback final.
- Usa una disposición diferente entre hero, split, focus, cards y chain, sin repetir.
- Cada narración debe tener entre 55 y 95 palabras para que las apariciones sean alcanzables.
- No incluyas eventos, timestamps ni frases de sincronización: Rukai derivará las apariciones del contenido y las alineará semánticamente contra la transcripción temporizada del MP3 terminado.
- Devuelve únicamente el objeto solicitado por el esquema.`;

const ALIGNMENT_SYSTEM_PROMPT = `Eres el sincronizador semántico de Rukai. Recibes las palabras temporizadas de un audio ya generado y los elementos visuales de una diapositiva.

Para cada evento, elige el índice de la palabra donde la narración empieza a explicar o vuelve relevante ese elemento visual. No busques una coincidencia literal: relaciona el significado del texto visible con el significado de la narración.

Reglas:
- Devuelve todos los ids recibidos exactamente una vez y ningún otro.
- wordIndex debe ser un entero válido de la transcripción.
- Distribuye las apariciones a lo largo de la narración según su momento pedagógico; no concentres todos los elementos al inicio.
- Dos eventos solo comparten wordIndex si deben aparecer realmente al mismo tiempo.
- interaction debe aparecer cuando comienza la pregunta o invitación a responder.
- Devuelve únicamente el objeto solicitado por el esquema.`;

const lessonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "theme", "slides"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    theme: {
      type: "string",
      enum: ["ember-ocean", "plum-sage", "cobalt-sand"],
    },
    slides: {
      type: "array",
      minItems: SLIDE_COUNT,
      maxItems: SLIDE_COUNT,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "phase",
          "layout",
          "tone",
          "visualKind",
          "eyebrow",
          "title",
          "body",
          "narration",
          "imagePrompt",
          "content",
          "interaction",
        ],
        properties: {
          phase: {
            type: "string",
            enum: ["intro", "content", "closing"],
          },
          layout: {
            type: "string",
            enum: ["hero", "split", "focus", "cards", "chain"],
          },
          tone: {
            type: "string",
            enum: ["dark", "light", "accent", "muted"],
          },
          visualKind: {
            type: "string",
            enum: ["image", "list", "stats", "chart", "table", "diagram"],
          },
          eyebrow: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          narration: { type: "string" },
          imagePrompt: { type: "string" },
          content: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "value", "detail"],
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                detail: { type: "string" },
              },
            },
          },
          interaction: {
            type: "object",
            additionalProperties: false,
            required: [
              "kind",
              "prompt",
              "ctaLabel",
              "options",
              "correctOptionIndexes",
              "explanation",
            ],
            properties: {
              kind: {
                type: "string",
                enum: [
                  "none",
                  "ready",
                  "single_choice",
                  "true_false",
                  "multiple_choice",
                ],
              },
              prompt: { type: "string" },
              ctaLabel: { type: "string" },
              options: {
                type: "array",
                minItems: 0,
                maxItems: 4,
                items: { type: "string" },
              },
              correctOptionIndexes: {
                type: "array",
                minItems: 0,
                maxItems: 3,
                items: { type: "integer", minimum: 0, maximum: 3 },
              },
              explanation: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

function alignmentSchema(eventIds: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["events"],
    properties: {
      events: {
        type: "array",
        minItems: eventIds.length,
        maxItems: eventIds.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "wordIndex"],
          properties: {
            id: { type: "string", enum: eventIds },
            wordIndex: { type: "integer", minimum: 0 },
          },
        },
      },
    },
  } as const;
}

type GeneratedSlide = {
  phase: "intro" | "content" | "closing";
  layout: "hero" | "split" | "focus" | "cards" | "chain";
  tone: "dark" | "light" | "accent" | "muted";
  visualKind: "image" | "list" | "stats" | "chart" | "table" | "diagram";
  eyebrow: string;
  title: string;
  body: string;
  narration: string;
  imagePrompt: string;
  content: Array<{ label: string; value: string; detail: string }>;
  interaction: GeneratedInteraction;
};

type GeneratedInteraction = {
  kind: "none" | "ready" | "single_choice" | "true_false" | "multiple_choice";
  prompt: string;
  ctaLabel: string;
  options: string[];
  correctOptionIndexes: number[];
  explanation: string;
};

type GeneratedLesson = {
  title: string;
  summary: string;
  theme: LessonTheme;
  slides: GeneratedSlide[];
};

type Usage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getGeneratedLessonError(
  value: unknown,
  expectedTheme: LessonTheme,
): string | null {
  if (!value || typeof value !== "object") {
    return "La respuesta no es un objeto.";
  }
  const lesson = value as Partial<GeneratedLesson>;
  if (typeof lesson.title !== "string") return "title no es texto.";
  if (typeof lesson.summary !== "string") return "summary no es texto.";
  if (!LESSON_THEMES.includes(lesson.theme as LessonTheme)) {
    return `Theme inválida: ${String(lesson.theme)}.`;
  }
  if (lesson.theme !== expectedTheme) {
    return `Theme ${lesson.theme} distinta de la asignada ${expectedTheme}.`;
  }
  if (!Array.isArray(lesson.slides)) return "slides no es un arreglo.";
  if (lesson.slides.length !== SLIDE_COUNT) {
    return `Se esperaban ${SLIDE_COUNT} diapositivas y llegaron ${lesson.slides.length}.`;
  }
  const slides = lesson.slides as Array<Partial<GeneratedSlide>>;

  if (slides.some((slide) => !slide || typeof slide !== "object")) {
    return "Una diapositiva no es un objeto.";
  }

  const imageCount = slides.filter(
    (slide) => slide.visualKind === "image",
  ).length;
  if (new Set(slides.map((slide) => slide.layout)).size !== SLIDE_COUNT) {
    return "Los cinco layouts no son únicos.";
  }
  if (new Set(slides.map((slide) => slide.tone)).size < 3) {
    return "La clase usa menos de tres tones distintos.";
  }
  if (new Set(slides.map((slide) => slide.visualKind)).size < 4) {
    return "La clase usa menos de cuatro visualKind distintos.";
  }
  if (imageCount < 1 || imageCount > 2) {
    return `Se esperaba una o dos slides image y llegaron ${imageCount}.`;
  }

  for (const [index, slide] of slides.entries()) {
    const prefix = `Diapositiva ${index + 1}:`;
    const expectedPhase =
      index === 0 ? "intro" : index === SLIDE_COUNT - 1 ? "closing" : "content";
    if (slide.phase !== expectedPhase) {
      return `${prefix} phase ${String(slide.phase)}; se esperaba ${expectedPhase}.`;
    }
    if (
      !slide.layout ||
      !["hero", "split", "focus", "cards", "chain"].includes(slide.layout)
    ) {
      return `${prefix} layout inválido: ${String(slide.layout)}.`;
    }
    if (
      !slide.tone ||
      !["dark", "light", "accent", "muted"].includes(slide.tone)
    ) {
      return `${prefix} tone inválido: ${String(slide.tone)}.`;
    }
    if (
      !slide.visualKind ||
      !["image", "list", "stats", "chart", "table", "diagram"].includes(
        slide.visualKind,
      )
    ) {
      return `${prefix} visualKind inválido: ${String(slide.visualKind)}.`;
    }
    if (typeof slide.eyebrow !== "string" || !slide.eyebrow.trim()) {
      return `${prefix} eyebrow vacío o inválido.`;
    }
    if (typeof slide.title !== "string" || !slide.title.trim()) {
      return `${prefix} title vacío o inválido.`;
    }
    if (typeof slide.body !== "string") return `${prefix} body no es texto.`;
    if (typeof slide.narration !== "string") {
      return `${prefix} narration no es texto.`;
    }
    if (typeof slide.imagePrompt !== "string") {
      return `${prefix} imagePrompt no es texto.`;
    }
    if (!Array.isArray(slide.content))
      return `${prefix} content no es un arreglo.`;
    if (!slide.interaction || typeof slide.interaction !== "object") {
      return `${prefix} interaction no es un objeto.`;
    }
    const wordCount = slide.narration.trim().split(/\s+/).length;
    const titleWordCount = slide.title.trim().split(/\s+/).length;
    const bodyWordCount = slide.body.trim()
      ? slide.body.trim().split(/\s+/).length
      : 0;
    if (titleWordCount > TITLE_WORD_LIMIT) {
      return `${prefix} title tiene ${titleWordCount} palabras; máximo técnico ${TITLE_WORD_LIMIT}.`;
    }
    if (bodyWordCount > BODY_WORD_LIMIT) {
      return `${prefix} body tiene ${bodyWordCount} palabras; máximo técnico ${BODY_WORD_LIMIT}.`;
    }
    if (
      (slide.visualKind === "image" && !slide.imagePrompt.trim()) ||
      (slide.visualKind !== "image" && slide.imagePrompt !== "")
    ) {
      return `${prefix} imagePrompt no corresponde a visualKind ${slide.visualKind}.`;
    }
    if (wordCount < 45 || wordCount > 110) {
      return `${prefix} narration tiene ${wordCount} palabras; se esperan 45–110.`;
    }
    if (slide.content.length < 2 || slide.content.length > 4) {
      return `${prefix} content tiene ${slide.content.length} elementos; se esperan 2–4.`;
    }
    if (
      slide.content.some(
        (item) =>
          typeof item?.label !== "string" ||
          typeof item.value !== "string" ||
          typeof item.detail !== "string",
      )
    ) {
      return `${prefix} un elemento de content tiene campos inválidos.`;
    }

    const interaction = slide.interaction as Partial<GeneratedInteraction>;
    const expectedInteraction =
      index === 0 ? "ready" : index === SLIDE_COUNT - 2 ? "question" : "none";
    const questionKinds = ["single_choice", "true_false", "multiple_choice"];
    if (
      !interaction.kind ||
      !["none", "ready", ...questionKinds].includes(interaction.kind)
    ) {
      return `${prefix} interaction.kind inválido: ${String(interaction.kind)}.`;
    }
    if (
      (expectedInteraction === "ready" && interaction.kind !== "ready") ||
      (expectedInteraction === "none" && interaction.kind !== "none") ||
      (expectedInteraction === "question" &&
        !questionKinds.includes(interaction.kind))
    ) {
      return `${prefix} interaction.kind ${interaction.kind}; se esperaba ${expectedInteraction}.`;
    }
    if (
      typeof interaction.prompt !== "string" ||
      typeof interaction.ctaLabel !== "string" ||
      typeof interaction.explanation !== "string" ||
      !Array.isArray(interaction.options) ||
      !Array.isArray(interaction.correctOptionIndexes)
    ) {
      return `${prefix} interaction tiene campos inválidos.`;
    }
    if (interaction.kind === "none") {
      if (
        interaction.prompt ||
        interaction.ctaLabel ||
        interaction.explanation ||
        interaction.options.length ||
        interaction.correctOptionIndexes.length
      ) {
        return `${prefix} interaction none debe tener sus campos vacíos.`;
      }
    } else {
      if (!interaction.prompt.trim() || !interaction.ctaLabel.trim()) {
        return `${prefix} interaction necesita prompt y ctaLabel.`;
      }
      if (
        !normalizedText(slide.narration).includes(
          normalizedText(interaction.prompt),
        )
      ) {
        return `${prefix} narration no contiene el enunciado exacto de interaction.prompt.`;
      }
    }
    if (interaction.kind === "ready") {
      if (
        interaction.options.length ||
        interaction.correctOptionIndexes.length ||
        interaction.explanation
      ) {
        return `${prefix} la invitación ready no debe contener respuestas.`;
      }
    }
    if (questionKinds.includes(interaction.kind)) {
      const expectedOptionCount = interaction.kind === "true_false" ? 2 : 4;
      const optionCount = interaction.options.length;
      if (optionCount !== expectedOptionCount) {
        return `${prefix} ${interaction.kind} necesita ${expectedOptionCount} opciones.`;
      }
      if (
        interaction.options.some((option) => !option.trim()) ||
        new Set(interaction.options).size !== interaction.options.length
      ) {
        return `${prefix} las opciones deben ser únicas y no pueden estar vacías.`;
      }
      if (!interaction.explanation.trim()) {
        return `${prefix} la pregunta necesita explanation para el feedback.`;
      }
      if (
        new Set(interaction.correctOptionIndexes).size !==
          interaction.correctOptionIndexes.length ||
        interaction.correctOptionIndexes.some(
          (optionIndex) =>
            !Number.isInteger(optionIndex) ||
            optionIndex < 0 ||
            optionIndex >= optionCount,
        )
      ) {
        return `${prefix} correctOptionIndexes contiene índices inválidos o repetidos.`;
      }
      const correctCount = interaction.correctOptionIndexes.length;
      if (
        (interaction.kind !== "multiple_choice" && correctCount !== 1) ||
        (interaction.kind === "multiple_choice" &&
          (correctCount < 2 || correctCount > 3))
      ) {
        return `${prefix} ${interaction.kind} tiene ${correctCount} respuestas correctas.`;
      }
      if (
        interaction.kind === "true_false" &&
        (interaction.options[0] !== "Verdadero" ||
          interaction.options[1] !== "Falso")
      ) {
        return `${prefix} true_false debe usar las opciones Verdadero y Falso, en ese orden.`;
      }
    }
    if (index > 0 && slide.tone === slides[index - 1].tone) {
      return `${prefix} repite el tone de la diapositiva anterior.`;
    }
  }

  return null;
}

function getVisibleText(slide: GeneratedSlide, eventId: string) {
  if (eventId === "eyebrow") return slide.eyebrow;
  if (eventId === "title") return slide.title;
  if (eventId === "body") return slide.body;
  if (eventId === "visual") return `${slide.title}. ${slide.imagePrompt}`;
  if (eventId === "interaction") return slide.interaction.prompt;
  const contentIndex = Number(eventId.replace("content-", ""));
  const item = slide.content[contentIndex];
  return item
    ? [item.value, item.label, item.detail].filter(Boolean).join(" — ")
    : eventId;
}

function getAuthoredEvents(slide: GeneratedSlide): AuthoredEvent[] {
  const ids = [
    "eyebrow",
    "title",
    ...(slide.body ? ["body"] : []),
    ...(slide.visualKind === "image"
      ? ["visual"]
      : slide.content.map((_, contentIndex) => `content-${contentIndex}`)),
    ...(slide.interaction.kind !== "none" ? ["interaction"] : []),
  ];

  return ids.map((id) => ({
    id,
    label: getVisibleText(slide, id),
    kind: id === "interaction" ? "interaction" : "reveal",
  }));
}

function estimateSpeechUsage(
  bytes: number,
  narration: string,
): Usage & {
  durationSeconds: number;
} {
  // OpenAI currently returns 128 kbps MP3 without a usage object. Deriving the
  // duration from bytes keeps the estimate tied to the generated artifact.
  const durationSeconds = Math.max(1, bytes / 16_000);
  const inputTokens = Math.ceil(narration.length / 4);
  const outputTokens = Math.ceil((durationSeconds / 60) * 1_250);
  return {
    durationSeconds,
    inputTokens,
    outputTokens,
    costUsd:
      inputTokens * RATES.speechTextInput +
      outputTokens * RATES.speechAudioOutput,
  };
}

function safeError(error: unknown) {
  if (!(error instanceof Error)) return "No se pudo generar la clase.";
  return error.message.slice(0, 300) || "No se pudo generar la clase.";
}

export const run = internalAction({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const storedFiles: Id<"_storage">[] = [];
    await ctx.runMutation(internal.classes.beginGeneration, {
      classId: args.classId,
    });

    try {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const lesson = await ctx.runQuery(internal.classes.getPrompt, {
        classId: args.classId,
      });
      if (!lesson) throw new Error("La clase ya no existe.");
      const selectedTheme =
        LESSON_THEMES[Math.floor(Math.random() * LESSON_THEMES.length)];
      const authoringInput = `Theme asignada al azar por Rukai: ${selectedTheme}. Debes devolver exactamente esa theme.\n\nCrea una clase completa a partir de este prompt del autor:\n\n${lesson.prompt}`;
      let parsed: GeneratedLesson | null = null;
      let previousOutput = "";
      let contractError = "";
      let inputTokens = 0;
      let outputTokens = 0;
      let costUsd = 0;

      for (let attempt = 1; attempt <= MAX_AUTHORING_ATTEMPTS; attempt += 1) {
        if (attempt > 1) {
          await ctx.runMutation(internal.classes.recordStep, {
            classId: args.classId,
            label: `Corrigiendo contrato ${attempt - 1}/${MAX_AUTHORING_ATTEMPTS - 1}: ${contractError}`,
          });
        }

        const response = await client.responses.create({
          model: TEXT_MODEL,
          instructions: LESSON_SYSTEM_PROMPT,
          input:
            attempt === 1
              ? authoringInput
              : `${authoringInput}\n\nEl objeto anterior incumplió esta regla: ${contractError}\nCorrige únicamente lo necesario, conserva la coherencia entre narración y contenido, y devuelve de nuevo el objeto completo.\n\nObjeto anterior:\n${previousOutput}`,
          reasoning: { effort: "low" },
          text: {
            format: {
              type: "json_schema",
              name: "rukai_lesson",
              strict: true,
              schema: lessonSchema,
            },
          },
          store: false,
        });

        const cachedTokens =
          response.usage?.input_tokens_details?.cached_tokens ?? 0;
        const attemptInputTokens = response.usage?.input_tokens ?? 0;
        const attemptOutputTokens = response.usage?.output_tokens ?? 0;
        inputTokens += attemptInputTokens;
        outputTokens += attemptOutputTokens;
        costUsd +=
          (attemptInputTokens - cachedTokens) * RATES.textInput +
          cachedTokens * RATES.textCachedInput +
          attemptOutputTokens * RATES.textOutput;
        previousOutput = response.output_text;

        try {
          const parsedValue: unknown = JSON.parse(response.output_text);
          contractError =
            getGeneratedLessonError(parsedValue, selectedTheme) ?? "";
          if (!contractError) {
            parsed = parsedValue as GeneratedLesson;
            break;
          }
        } catch {
          contractError = "OpenAI devolvió JSON inválido.";
        }
      }

      if (!parsed) {
        throw new Error(
          `Contrato inválido tras ${MAX_AUTHORING_ATTEMPTS} intentos: ${contractError}`,
        );
      }

      await ctx.runMutation(internal.classes.recordStep, {
        classId: args.classId,
        label: "Creando diapositivas",
      });

      for (const [index, slide] of parsed.slides.entries()) {
        const slideEvents = getAuthoredEvents(slide);
        let imageStorageId: Id<"_storage"> | undefined;
        if (slide.visualKind === "image") {
          await ctx.runMutation(internal.classes.recordStep, {
            classId: args.classId,
            label: `Generando imagen para la diapositiva ${index + 1}`,
          });
          const image = await client.images.generate({
            model: IMAGE_MODEL,
            prompt: `${slide.imagePrompt}\n\nEstilo compartido: ilustración editorial cinematográfica y educativa, composición horizontal limpia, paleta ${parsed.theme}, sin texto, sin logotipos, sin marcas de agua.`,
            n: 1,
            quality: "low",
            size: "1536x1024",
            output_format: "webp",
            output_compression: 82,
          });
          const imageBase64 = image.data?.[0]?.b64_json;
          if (!imageBase64) {
            throw new Error("OpenAI no devolvió la imagen esperada.");
          }
          const imageBytes = Buffer.from(imageBase64, "base64");
          imageStorageId = await ctx.storage.store(
            new Blob([imageBytes], { type: "image/webp" }),
          );
          storedFiles.push(imageStorageId);

          const imageInputTokens = image.usage?.input_tokens ?? 0;
          const imageOutputTokens = image.usage?.output_tokens ?? 0;
          inputTokens += imageInputTokens;
          outputTokens += imageOutputTokens;
          costUsd +=
            imageInputTokens * RATES.imageTextInput +
            imageOutputTokens * RATES.imageOutput;
        }

        await ctx.runMutation(internal.classes.recordStep, {
          classId: args.classId,
          label: `Narrando diapositiva ${index + 1}/${SLIDE_COUNT}`,
        });
        const speech = await client.audio.speech.create({
          model: SPEECH_MODEL,
          voice: VOICE,
          input: slide.narration,
          instructions:
            "Habla en español latino neutro, con una voz cálida, clara y pedagógica. Mantén un ritmo sereno y cinematográfico, con pausas naturales.",
          response_format: "mp3",
        });
        const audioBytes = Buffer.from(await speech.arrayBuffer());
        const audioStorageId = await ctx.storage.store(
          new Blob([audioBytes], { type: "audio/mpeg" }),
        );
        storedFiles.push(audioStorageId);
        const speechUsage = estimateSpeechUsage(
          audioBytes.byteLength,
          slide.narration,
        );
        inputTokens += speechUsage.inputTokens;
        outputTokens += speechUsage.outputTokens;
        costUsd += speechUsage.costUsd;

        await ctx.runMutation(internal.classes.recordStep, {
          classId: args.classId,
          label: `Transcribiendo diapositiva ${index + 1}/${SLIDE_COUNT}`,
        });
        const transcription = await client.audio.transcriptions.create({
          file: await toFile(audioBytes, `diapositiva-${index + 1}.mp3`, {
            type: "audio/mpeg",
          }),
          model: TRANSCRIPTION_MODEL,
          language: "es",
          prompt: slide.narration,
          response_format: "verbose_json",
          timestamp_granularities: ["word"],
        });
        costUsd += (transcription.duration / 60) * RATES.transcriptionMinute;

        const timedWords = transcription.words ?? [];
        if (!timedWords.length) {
          throw new Error(
            `OpenAI no devolvió palabras temporizadas para la diapositiva ${index + 1}.`,
          );
        }
        const alignmentInput = JSON.stringify({
          narration: transcription.text,
          words: timedWords.map((word, wordIndex) => ({
            wordIndex,
            word: word.word,
          })),
          events: slideEvents.map((event) => ({
            id: event.id,
            visibleText: getVisibleText(slide, event.id),
          })),
        });
        let synchronizedEvents: ReturnType<typeof synchronizeEvents> | null =
          null;
        let alignmentError = "";

        for (
          let alignmentAttempt = 1;
          alignmentAttempt <= MAX_ALIGNMENT_ATTEMPTS;
          alignmentAttempt += 1
        ) {
          await ctx.runMutation(internal.classes.recordStep, {
            classId: args.classId,
            label: `Alineando escena ${index + 1}/${SLIDE_COUNT}${
              alignmentAttempt > 1 ? `, intento ${alignmentAttempt}` : ""
            }`,
          });
          const alignmentResponse = await client.responses.create({
            model: TEXT_MODEL,
            instructions: ALIGNMENT_SYSTEM_PROMPT,
            input:
              alignmentAttempt === 1
                ? alignmentInput
                : `${alignmentInput}\n\nLa alineación anterior fue inválida: ${alignmentError}. Devuelve una alineación completa corregida.`,
            reasoning: { effort: "low" },
            text: {
              format: {
                type: "json_schema",
                name: "rukai_event_alignment",
                strict: true,
                schema: alignmentSchema(slideEvents.map((event) => event.id)),
              },
            },
            store: false,
          });
          const cachedTokens =
            alignmentResponse.usage?.input_tokens_details?.cached_tokens ?? 0;
          const alignmentInputTokens =
            alignmentResponse.usage?.input_tokens ?? 0;
          const alignmentOutputTokens =
            alignmentResponse.usage?.output_tokens ?? 0;
          inputTokens += alignmentInputTokens;
          outputTokens += alignmentOutputTokens;
          costUsd +=
            (alignmentInputTokens - cachedTokens) * RATES.textInput +
            cachedTokens * RATES.textCachedInput +
            alignmentOutputTokens * RATES.textOutput;

          try {
            const alignment = JSON.parse(alignmentResponse.output_text) as {
              events: EventAlignment[];
            };
            synchronizedEvents = synchronizeEvents(
              slideEvents,
              timedWords,
              alignment.events,
            );
            break;
          } catch (error) {
            alignmentError = safeError(error);
          }
        }
        if (!synchronizedEvents) {
          throw new Error(
            `No se pudo alinear la diapositiva ${index + 1}: ${alignmentError}`,
          );
        }

        const savedSlideId = await ctx.runMutation(internal.classes.saveSlide, {
          classId: args.classId,
          order: index,
          phase: slide.phase,
          layout: slide.layout,
          tone: slide.tone,
          visualKind: slide.visualKind,
          eyebrow: slide.eyebrow,
          title: slide.title,
          body: slide.body,
          narration: slide.narration,
          facts: slide.content.map((item) => item.label),
          content: slide.content,
          events: synchronizedEvents,
          ...(slide.interaction.kind !== "none"
            ? {
                interaction: {
                  kind: slide.interaction.kind,
                  prompt: slide.interaction.prompt,
                  ctaLabel: slide.interaction.ctaLabel,
                  options: slide.interaction.options,
                  correctOptionIndexes: slide.interaction.correctOptionIndexes,
                  explanation: slide.interaction.explanation,
                },
              }
            : {}),
          ...(imageStorageId ? { imageStorageId } : {}),
          audioStorageId,
          audioDurationSeconds: speechUsage.durationSeconds,
        });
        if (!savedSlideId) {
          throw new Error("La clase fue eliminada durante la generación.");
        }
      }

      await ctx.runMutation(internal.classes.recordStep, {
        classId: args.classId,
        label: "Publicando la clase",
      });
      await ctx.runMutation(internal.classes.completeGeneration, {
        classId: args.classId,
        title: parsed.title,
        summary: parsed.summary,
        theme: parsed.theme,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
        models: [TEXT_MODEL, IMAGE_MODEL, SPEECH_MODEL, TRANSCRIPTION_MODEL],
      });
    } catch (error) {
      for (const storageId of storedFiles) {
        try {
          await ctx.storage.delete(storageId);
        } catch {
          // Preserve the original generation failure.
        }
      }
      const errorMessage = safeError(error);
      console.error(`[generateLesson] ${args.classId}: ${errorMessage}`);
      await ctx.runMutation(internal.classes.failGeneration, {
        classId: args.classId,
        error: errorMessage,
      });
    }
    return null;
  },
});
