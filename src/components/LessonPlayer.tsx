import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  PauseIcon,
  PlayIcon,
  ReloadIcon,
  Share1Icon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  StopIcon,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import {
  canContinueFromInteraction,
  clampSeekTime,
  formatPlaybackTime,
  visibleEventIds,
  type LessonDefinition,
  type LessonInteraction,
  type LessonTheme,
  type PresentationEvent,
  type PresentationSlide,
} from "@/presentation";

type NarrationState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error"
  | "finished";

const NEXT_SLIDE_DELAY_MS = 350;

type LessonResponse = {
  selectedOptionIndexes: number[];
  correct: boolean;
};

function sameOptions(left: readonly number[], right: readonly number[]) {
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function sceneClass(visible: boolean, scale = false) {
  return `timeline-element${scale ? " timeline-element-scale" : ""}${visible ? " is-visible" : ""}`;
}

const palettes = {
  "ember-ocean": {
    dark: "#0b1518",
    light: "#fff4e4",
    accent: "#e97b4f",
    muted: "#29484b",
    secondary: "#62bcb2",
  },
  "plum-sage": {
    dark: "#1e1220",
    light: "#f8f7df",
    accent: "#d58cad",
    muted: "#4c604c",
    secondary: "#a8c795",
  },
  "cobalt-sand": {
    dark: "#0b1730",
    light: "#fff0cf",
    accent: "#89adff",
    muted: "#785f3f",
    secondary: "#e5b85c",
  },
} as const;

function sceneStyle(
  theme: LessonTheme,
  tone: PresentationSlide["tone"] = "dark",
) {
  const palette = palettes[theme];
  const isLight = tone === "light" || tone === "accent";
  return {
    "--slide-bg": palette[tone],
    "--slide-ink": isLight ? palette.dark : palette.light,
    "--slide-muted": isLight ? palette.dark : palette.light,
    "--slide-accent": isLight ? palette.dark : palette.light,
    "--slide-secondary": palette.secondary,
    "--slide-panel": isLight ? `${palette.dark}20` : `${palette.light}24`,
  } as CSSProperties;
}

function DecorativeVector() {
  return (
    <svg
      className="pointer-events-none absolute -right-16 -top-20 h-[420px] w-[420px] opacity-35"
      viewBox="0 0 420 420"
      aria-hidden="true"
    >
      <circle
        cx="210"
        cy="210"
        r="150"
        fill="none"
        stroke="var(--slide-accent)"
        strokeWidth="2"
      />
      <circle
        cx="210"
        cy="210"
        r="105"
        fill="none"
        stroke="var(--slide-secondary)"
        strokeDasharray="7 12"
      />
      <path
        d="M48 252C126 92 268 82 382 200"
        fill="none"
        stroke="var(--slide-accent)"
        strokeWidth="18"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Copy({
  slide,
  visible,
  centered = false,
}: {
  slide: PresentationSlide;
  visible: ReadonlySet<string>;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p
        className={`${sceneClass(visible.has("eyebrow"))} mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--slide-accent)]`}
      >
        {slide.eyebrow}
      </p>
      <h2
        className={`${sceneClass(visible.has("title"))} text-balance font-serif text-[clamp(1.8rem,4.25vw,3.6rem)] font-normal leading-[1.01] tracking-[-0.045em]`}
      >
        {slide.title}
      </h2>
      {slide.body && (
        <p
          className={`${sceneClass(visible.has("body"))} mt-4 max-w-xl text-balance text-[clamp(0.9rem,1.3vw,1.08rem)] leading-relaxed text-[var(--slide-muted)] ${centered ? "mx-auto" : ""}`}
        >
          {slide.body}
        </p>
      )}
    </div>
  );
}

function VisualContent({
  slide,
  visible,
  className = "",
}: {
  slide: PresentationSlide;
  visible: ReadonlySet<string>;
  className?: string;
}) {
  const kind = slide.visualKind ?? (slide.imageUrl ? "image" : "list");
  const items =
    slide.content ??
    (slide.facts ?? []).map((label, index) => ({
      label,
      value: String(index + 1).padStart(2, "0"),
      detail: "",
    }));
  const itemClass = (index: number) =>
    sceneClass(
      visible.has("visual") ||
        visible.has(`content-${index}`) ||
        visible.has(`fact-${index}`),
    );

  if (kind === "image") {
    return (
      <div
        className={`${sceneClass(visible.has("visual"), true)} min-h-56 rounded-[2rem] bg-cover bg-center shadow-2xl ${className}`}
        style={
          slide.imageUrl
            ? { backgroundImage: `url("${slide.imageUrl}")` }
            : undefined
        }
        role="img"
        aria-label={`Ilustración de ${slide.title}`}
      />
    );
  }

  if (kind === "stats") {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {items.map((item, index) => (
          <div
            className={`${itemClass(index)} border-l-2 border-[var(--slide-accent)] py-2 pl-4`}
            key={`${item.label}-${index}`}
          >
            <strong className="block text-3xl tracking-[-.05em] text-[var(--slide-accent)]">
              {item.value}
            </strong>
            <span className="mt-2 block text-sm font-semibold">
              {item.label}
            </span>
            {item.detail && (
              <small className="mt-1 block text-[11px] text-[var(--slide-muted)]">
                {item.detail}
              </small>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (kind === "chart") {
    return (
      <div className={`grid gap-3 ${className}`}>
        {items.map((item, index) => {
          const value = Math.max(
            0,
            Math.min(100, Number.parseFloat(item.value) || 0),
          );
          return (
            <div
              className={`${itemClass(index)} grid gap-1.5`}
              key={`${item.label}-${index}`}
            >
              <div className="flex items-end justify-between gap-4 text-xs">
                <strong>{item.label}</strong>
                <span className="font-semibold text-[var(--slide-accent)]">
                  {item.value}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--slide-panel)]">
                <span
                  className="block h-full rounded-full bg-[var(--slide-accent)]"
                  style={{ width: `${value}%` }}
                />
              </div>
              {item.detail && (
                <small className="text-[10px] text-[var(--slide-muted)]">
                  {item.detail}
                </small>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (kind === "table") {
    return (
      <div className={className} role="table">
        {items.map((item, index) => (
          <div
            className={`${itemClass(index)} grid grid-cols-[1fr_auto] gap-5 border-b border-current/20 py-3 last:border-0`}
            role="row"
            key={`${item.label}-${index}`}
          >
            <span className="text-sm font-medium" role="cell">
              {item.label}
            </span>
            <strong className="text-sm text-[var(--slide-accent)]" role="cell">
              {item.value}
            </strong>
            {item.detail && (
              <small className="col-span-2 text-[11px] text-[var(--slide-muted)]">
                {item.detail}
              </small>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (kind === "diagram") {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      >
        {items.map((item, index) => (
          <div className="contents" key={`${item.label}-${index}`}>
            {index > 0 && (
              <span className={itemClass(index)} aria-hidden="true">
                →
              </span>
            )}
            <div
              className={`${itemClass(index)} min-w-28 px-3 py-3 text-center`}
            >
              <span
                className="mx-auto mb-3 block size-2 rounded-full bg-[var(--slide-accent)]"
                aria-hidden="true"
              />
              <strong className="block text-sm">{item.label}</strong>
              {item.value && (
                <small className="mt-1 block text-[10px] text-[var(--slide-muted)]">
                  {item.value}
                </small>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol className={`grid grid-cols-1 ${className}`}>
      {items.map((item, index) => (
        <li
          className={`${itemClass(index)} grid grid-cols-[1.75rem_1fr] gap-3 border-b border-current/20 py-3 last:border-0`}
          key={`${item.label}-${index}`}
        >
          <span className="text-xs font-bold text-[var(--slide-accent)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <strong className="block text-sm">{item.label}</strong>
            {item.detail && (
              <small className="mt-1 block text-[11px] leading-relaxed text-[var(--slide-muted)]">
                {item.detail}
              </small>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function SlideScene({
  slide,
  currentTime,
  theme,
}: {
  slide: PresentationSlide;
  currentTime: number;
  theme: LessonTheme;
}) {
  const visible = visibleEventIds(slide.events, currentTime);
  const rootClass =
    "relative h-full overflow-hidden bg-[var(--slide-bg)] text-[var(--slide-ink)]";
  const rootStyle = sceneStyle(theme, slide.tone);

  if (slide.layout === "split") {
    return (
      <div
        className={`${rootClass} grid items-center gap-8 p-[clamp(2rem,5vw,4.5rem)] pb-[6.5rem] md:grid-cols-[1fr_.9fr]`}
        style={rootStyle}
      >
        <DecorativeVector />
        <Copy slide={slide} visible={visible} />
        <VisualContent
          slide={slide}
          visible={visible}
          className="relative z-10"
        />
      </div>
    );
  }

  if (slide.layout === "focus") {
    return (
      <div
        className={`${rootClass} grid items-center gap-8 p-[clamp(2rem,5vw,4.5rem)] pb-[6.5rem] md:grid-cols-[.9fr_1.1fr]`}
        style={rootStyle}
      >
        <VisualContent
          slide={slide}
          visible={visible}
          className="relative z-10"
        />
        <Copy slide={slide} visible={visible} />
      </div>
    );
  }

  if (slide.layout === "cards") {
    return (
      <div
        className={`${rootClass} flex flex-col justify-center p-[clamp(2rem,5vw,4.5rem)] pb-[6.5rem]`}
        style={rootStyle}
      >
        <Copy slide={slide} visible={visible} />
        <VisualContent slide={slide} visible={visible} className="mt-7" />
      </div>
    );
  }

  if (slide.layout === "chain") {
    return (
      <div
        className={`${rootClass} flex flex-col justify-between p-[clamp(2rem,5vw,4.5rem)] pb-[6.5rem]`}
        style={rootStyle}
      >
        <DecorativeVector />
        <Copy slide={slide} visible={visible} centered />
        <VisualContent
          slide={slide}
          visible={visible}
          className="relative z-10 mt-7"
        />
      </div>
    );
  }

  return (
    <div
      className={`${rootClass} grid items-end p-[clamp(2rem,6vw,5rem)] pb-[6.5rem] md:grid-cols-[1.1fr_.9fr]`}
      style={rootStyle}
    >
      {slide.visualKind === "image" && slide.imageUrl && (
        <div
          className="ken-burns absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${slide.imageUrl}")` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg,var(--slide-bg) 0%,var(--slide-bg) 48%,transparent 100%)",
        }}
      />
      <div className="relative z-10 self-center">
        <Copy slide={slide} visible={visible} />
      </div>
      {slide.visualKind !== "image" && (
        <VisualContent
          slide={slide}
          visible={visible}
          className="relative z-10"
        />
      )}
    </div>
  );
}

function Timeline({
  events,
  currentTime,
  duration,
  maxReachedTime,
  playing,
  onToggle,
  onSeek,
}: {
  events: readonly PresentationEvent[];
  currentTime: number;
  duration: number;
  maxReachedTime: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (time: number) => void;
}) {
  const fallbackDuration = Math.max(events.at(-1)?.at ?? 0, 1) + 2;
  const displayDuration = duration || fallbackDuration;
  const progress = Math.min(100, (currentTime / displayDuration) * 100);
  const reached = Math.min(100, (maxReachedTime / displayDuration) * 100);
  const timelineStyle = {
    "--timeline-progress": `${progress}%`,
    "--timeline-reached": `${reached}%`,
  } as CSSProperties;

  return (
    <div
      className="lesson-timeline absolute inset-x-4 bottom-4 z-30 flex h-14 items-center gap-3 rounded-2xl border border-white/15 bg-[#100c09]/80 px-3 shadow-[0_12px_35px_rgba(0,0,0,.35)] backdrop-blur-xl sm:inset-x-6"
      data-lesson-timeline
      aria-label="Línea de tiempo de la diapositiva"
    >
      <button
        className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        onClick={onToggle}
        aria-label={playing ? "Pausar" : "Reproducir"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="relative min-w-0 flex-1" style={timelineStyle}>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-white/25"
            style={{ width: `${reached}%` }}
          />
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[#df7c3d]"
            style={{ width: `${progress}%` }}
          />
          {events.map((event) => (
            <span
              className={`timeline-marker${event.at <= currentTime ? " is-past" : ""}${event.kind === "interaction" ? " is-interaction" : ""}`}
              key={event.id}
              style={{
                left: `${Math.min(100, (event.at / displayDuration) * 100)}%`,
              }}
              title={`${event.label} · ${formatPlaybackTime(event.at)}`}
            />
          ))}
        </div>
        <input
          className="timeline-range relative z-10 h-8 w-full cursor-pointer"
          type="range"
          min="0"
          max={displayDuration}
          step="0.05"
          value={Math.min(currentTime, displayDuration)}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Retroceder dentro de la diapositiva"
        />
      </div>
      <span className="min-w-[72px] text-right text-[10px] tabular-nums text-white/65">
        {formatPlaybackTime(currentTime)} /{" "}
        {formatPlaybackTime(displayDuration)}
      </span>
    </div>
  );
}

function InteractionPanel({
  interaction,
  completed,
  selectedOptions,
  narrationFinished,
  onToggleOption,
  onSubmit,
}: {
  interaction: LessonInteraction;
  completed: boolean;
  selectedOptions: readonly number[];
  narrationFinished: boolean;
  onToggleOption: (optionIndex: number) => void;
  onSubmit: (optionIndexes?: readonly number[]) => void;
}) {
  const multiple = interaction.kind === "multiple_choice";

  return (
    <div className="slide-interactive timeline-element is-visible absolute inset-x-4 bottom-20 z-40 max-h-[calc(100%-6rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#19120c]/95 p-4 shadow-2xl backdrop-blur-md sm:inset-x-8 sm:p-5">
      <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#dfa763]">
        {interaction.kind === "ready" ? "Tu señal" : "Tu turno"}
      </p>
      <h3 className="mt-1 max-w-3xl text-balance font-serif text-[clamp(1.35rem,3vw,2rem)] leading-tight">
        {interaction.prompt}
      </h3>

      {interaction.kind === "ready" ? (
        <Button
          size="lg"
          className="mt-4 min-h-12 rounded-full bg-[#df7c3d] px-8 text-[#160e08] hover:bg-[#ef955b]"
          onClick={() => onSubmit()}
          disabled={completed}
        >
          {completed ? "Señal recibida ✓" : interaction.ctaLabel}
        </Button>
      ) : (
        <>
          {multiple && !completed && (
            <p className="mt-2 text-xs text-white/55">
              Puedes elegir más de una respuesta.
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {interaction.options.map((option, optionIndex) => {
              const selected = selectedOptions.includes(optionIndex);
              return (
                <button
                  className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa763] ${
                    selected
                      ? "border-[#dfa763] bg-[#dfa763]/20 text-white"
                      : "border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10"
                  }`}
                  key={`${option}-${optionIndex}`}
                  onClick={() =>
                    multiple
                      ? onToggleOption(optionIndex)
                      : onSubmit([optionIndex])
                  }
                  disabled={completed}
                  aria-pressed={selected}
                >
                  <span className="mr-2 text-[#dfa763]">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
          {multiple && (
            <Button
              size="lg"
              className="mt-4 min-h-11 rounded-full bg-[#df7c3d] px-8 text-[#160e08] hover:bg-[#ef955b]"
              onClick={() => onSubmit(selectedOptions)}
              disabled={completed || selectedOptions.length === 0}
            >
              {completed ? "Respuesta registrada ✓" : interaction.ctaLabel}
            </Button>
          )}
        </>
      )}

      {completed && (
        <p className="mt-3 text-xs text-white/55" aria-live="polite">
          {narrationFinished
            ? "Continuamos con la clase."
            : "Respuesta registrada. Continuaremos al terminar la narración."}
        </p>
      )}
    </div>
  );
}

function FeedbackSummary({
  lesson,
  responses,
}: {
  lesson: LessonDefinition;
  responses: Readonly<Record<number, LessonResponse>>;
}) {
  const answered = Object.entries(responses).flatMap(([index, response]) => {
    const slide = lesson.slides[Number(index)];
    return slide?.interaction && slide.interaction.kind !== "ready"
      ? [{ slide, interaction: slide.interaction, response }]
      : [];
  });

  if (!answered.length) return null;

  return (
    <div className="absolute inset-4 z-50 overflow-y-auto rounded-2xl bg-[#faf8f2]/95 p-5 text-[#21170f] shadow-2xl backdrop-blur-lg sm:inset-8 sm:p-7">
      <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#a94d20]">
        Feedback de la clase
      </p>
      <h3 className="mt-2 font-serif text-3xl tracking-[-.04em]">Así te fue</h3>
      <div className="mt-5 grid gap-4">
        {answered.map(({ interaction, response }, index) => (
          <article
            className="border-t border-black/10 pt-4 first:border-0 first:pt-0"
            key={`${interaction.prompt}-${index}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
                  response.correct
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
                aria-hidden="true"
              >
                {response.correct ? <CheckIcon /> : <Cross2Icon />}
              </span>
              <div>
                <strong className="block text-sm">
                  {response.correct
                    ? "Respuesta correcta"
                    : "Respuesta incorrecta"}
                </strong>
                <p className="mt-1 text-sm leading-relaxed text-black/65">
                  {interaction.prompt}
                </p>
              </div>
            </div>
            <dl className="mt-3 grid gap-1 pl-10 text-xs">
              <div>
                <dt className="inline font-bold">Tu respuesta: </dt>
                <dd className="inline text-black/60">
                  {response.selectedOptionIndexes
                    .map((optionIndex) => interaction.options[optionIndex])
                    .join(", ")}
                </dd>
              </div>
              {!response.correct && (
                <div>
                  <dt className="inline font-bold">Respuesta correcta: </dt>
                  <dd className="inline text-black/60">
                    {interaction.correctOptionIndexes
                      .map((optionIndex) => interaction.options[optionIndex])
                      .join(", ")}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 pl-10 text-xs leading-relaxed text-black/55">
              {interaction.explanation}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1_000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
}

export function LessonPlayer({
  lesson,
  onBack,
  shareUrl,
}: {
  lesson: LessonDefinition;
  onBack: () => void;
  shareUrl?: string;
}) {
  const [started, setStarted] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [state, setState] = useState<NarrationState>("idle");
  const [error, setError] = useState("");
  const [voice, setVoice] = useState(lesson.voices[0] ?? "marin");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxReachedTime, setMaxReachedTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [completedInteractions, setCompletedInteractions] = useState<
    ReadonlySet<number>
  >(new Set());
  const [responses, setResponses] = useState<Record<number, LessonResponse>>(
    {},
  );
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef(0);
  const animationFrameRef = useRef(0);
  const maxReachedTimeRef = useRef(0);
  const completedInteractionsRef = useRef(new Set<number>());
  const mutedRef = useRef(false);
  const narrationFinishedRef = useRef(false);
  const narrationTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      requestRef.current += 1;
      cancelAnimationFrame(animationFrameRef.current);
      if (narrationTimerRef.current !== null) {
        window.clearTimeout(narrationTimerRef.current);
      }
      audioRef.current?.pause();
    },
    [],
  );

  const clearTimer = () => {
    if (narrationTimerRef.current === null) return;
    window.clearTimeout(narrationTimerRef.current);
    narrationTimerRef.current = null;
  };

  const schedule = (callback: () => void) => {
    clearTimer();
    narrationTimerRef.current = window.setTimeout(() => {
      narrationTimerRef.current = null;
      callback();
    }, NEXT_SLIDE_DELAY_MS);
  };

  const resetPlayback = () => {
    setError("");
    setState("loading");
    setCurrentTime(0);
    setDuration(0);
    setMaxReachedTime(0);
    setSelectedOptions([]);
    setFeedbackVisible(false);
    narrationFinishedRef.current = false;
    maxReachedTimeRef.current = 0;
  };

  const narrate = async (index: number, selectedVoice: string = voice) => {
    clearTimer();
    const requestId = ++requestRef.current;
    cancelAnimationFrame(animationFrameRef.current);
    if (audioRef.current) {
      audioRef.current.onpause = null;
      audioRef.current.pause();
    }
    resetPlayback();

    const audioUrl = lesson.slides[index]?.audioByVoice?.[selectedVoice];
    if (!audioUrl) {
      setError("No encontramos la narración publicada para esta clase.");
      setState("error");
      return;
    }

    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.playbackRate = 1;
    audio.muted = mutedRef.current;
    audioRef.current = audio;

    const updateClock = () => {
      if (requestId !== requestRef.current) return;
      const nextTime = audio.currentTime;
      const nextMax = Math.max(maxReachedTimeRef.current, nextTime);
      maxReachedTimeRef.current = nextMax;
      setCurrentTime(nextTime);
      setMaxReachedTime(nextMax);
      if (!audio.paused && !audio.ended) {
        animationFrameRef.current = requestAnimationFrame(updateClock);
      }
    };

    audio.onloadedmetadata = () => {
      if (requestId === requestRef.current) setDuration(audio.duration);
    };
    audio.onplay = () => {
      if (requestId !== requestRef.current) return;
      setState("playing");
      animationFrameRef.current = requestAnimationFrame(updateClock);
    };
    audio.onpause = () => {
      if (requestId !== requestRef.current || audio.ended) return;
      cancelAnimationFrame(animationFrameRef.current);
      updateClock();
      setState("paused");
    };
    audio.onerror = () => {
      if (requestId !== requestRef.current) return;
      setError("No encontramos la narración publicada para esta clase.");
      setState("error");
    };
    audio.onended = () => {
      if (requestId !== requestRef.current) return;
      cancelAnimationFrame(animationFrameRef.current);
      setCurrentTime(audio.duration);
      maxReachedTimeRef.current = audio.duration;
      narrationFinishedRef.current = true;
      setMaxReachedTime(audio.duration);
      setState("finished");

      const isInteractionSlide = Boolean(lesson.slides[index]?.interaction);
      const canAdvance =
        !isInteractionSlide ||
        canContinueFromInteraction(
          true,
          completedInteractionsRef.current.has(index),
        );
      if (canAdvance && index < lesson.slides.length - 1) {
        const nextIndex = index + 1;
        setSlideIndex(nextIndex);
        resetPlayback();
        schedule(() => void narrate(nextIndex, selectedVoice));
      } else if (index === lesson.slides.length - 1) {
        setFeedbackVisible(true);
      }
    };

    try {
      await audio.play();
      const nextUrl = lesson.slides[index + 1]?.audioByVoice?.[selectedVoice];
      if (nextUrl) {
        const nextAudio = new Audio(nextUrl);
        nextAudio.preload = "auto";
      }
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "No pudimos iniciar la narración.",
      );
      setState("error");
    }
  };

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state === "playing") return audio.pause();
    if (audio.ended) {
      audio.currentTime = 0;
      narrationFinishedRef.current = false;
      setCurrentTime(0);
      setFeedbackVisible(false);
    }
    try {
      await audio.play();
    } catch {
      setError("No pudimos reanudar la narración.");
      setState("error");
    }
  };

  const seekTo = (requestedTime: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const target = clampSeekTime(
      requestedTime,
      maxReachedTimeRef.current,
      duration,
    );
    audio.currentTime = target;
    if (target < duration) narrationFinishedRef.current = false;
    setCurrentTime(target);
    if (audio.ended || state === "finished") setState("paused");
  };

  const visibleEvents = visibleEventIds(
    lesson.slides[slideIndex].events,
    currentTime,
  );
  const interaction = lesson.slides[slideIndex].interaction;
  const interactionVisible =
    Boolean(interaction) && visibleEvents.has("interaction");
  const interactionCompleted = completedInteractions.has(slideIndex);
  const status =
    muted && started
      ? "Narración silenciada"
      : state === "loading"
        ? "Preparando audio…"
        : state === "playing"
          ? "Narrando"
          : state === "paused"
            ? "En pausa"
            : state === "finished"
              ? "Narración completa"
              : "Audio listo";

  const completeInteraction = (optionIndexes: readonly number[] = []) => {
    if (!interaction || completedInteractionsRef.current.has(slideIndex)) {
      return;
    }
    const selected = [...optionIndexes];
    completedInteractionsRef.current.add(slideIndex);
    setCompletedInteractions(new Set(completedInteractionsRef.current));
    setSelectedOptions(selected);
    if (interaction.kind !== "ready") {
      setResponses((current) => ({
        ...current,
        [slideIndex]: {
          selectedOptionIndexes: selected,
          correct: sameOptions(selected, interaction.correctOptionIndexes),
        },
      }));
    }
    if (!canContinueFromInteraction(narrationFinishedRef.current, true)) return;
    const nextIndex = slideIndex + 1;
    if (nextIndex >= lesson.slides.length) return;
    setSlideIndex(nextIndex);
    resetPlayback();
    schedule(() => void narrate(nextIndex));
  };

  const toggleOption = (optionIndex: number) => {
    setSelectedOptions((current) =>
      current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex],
    );
  };

  const toggleMute = () => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (audioRef.current) audioRef.current.muted = nextMuted;
  };

  const restartSlide = () => {
    requestRef.current += 1;
    cancelAnimationFrame(animationFrameRef.current);
    audioRef.current?.pause();
    resetPlayback();
    schedule(() => void narrate(slideIndex));
  };

  const shareLesson = async () => {
    if (!shareUrl) return;
    setShareStatus("idle");
    if (navigator.share) {
      try {
        await navigator.share({
          title: lesson.title,
          text: "Mira esta clase interactiva en Rukai.",
          url: shareUrl,
        });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2dfbf,transparent_35%),#ebe4d5] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-black/55 transition hover:text-black"
            onClick={onBack}
          >
            <ArrowLeftIcon /> Todas las clases
          </button>
          {shareUrl && (
            <div>
              <span className="sr-only" aria-live="polite">
                {shareStatus === "copied"
                  ? "Enlace copiado"
                  : shareStatus === "error"
                    ? "No pudimos copiar el enlace"
                    : ""}
              </span>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-[#faf8f2]/80 px-4 text-sm font-semibold text-black/65 shadow-sm transition hover:border-black/20 hover:bg-[#faf8f2]"
                onClick={() => void shareLesson()}
              >
                <Share1Icon />
                {shareStatus === "copied"
                  ? "Enlace copiado"
                  : shareStatus === "error"
                    ? "Reintentar"
                    : "Compartir"}
              </button>
            </div>
          )}
        </div>

        <section
          className="mb-3 grid gap-2 sm:grid-cols-3"
          aria-label="Métricas de generación"
        >
          <MetricCard
            label="Tiempo de generación"
            value={formatDuration(lesson.metrics.generationDurationMs)}
          />
          <MetricCard
            label="Tokens y modelos"
            value={lesson.metrics.totalTokens.toLocaleString("es-CO")}
            detail={lesson.metrics.models.join(" · ")}
          />
          <MetricCard
            label="Costo de generación"
            value={`US$ ${lesson.metrics.costUsd.toFixed(3)}`}
            detail={
              lesson.metrics.usageEstimated
                ? "Incluye audio estimado"
                : undefined
            }
          />
        </section>

        <section
          className="grid w-full gap-2 overflow-hidden border border-black/10 bg-[#faf8f2] p-2 shadow-[0_24px_70px_rgba(67,45,28,.13)] sm:rounded-[28px] sm:p-3 lg:grid-cols-[250px_minmax(0,1fr)]"
          aria-label={`Clase guiada ${lesson.title}`}
        >
          <aside className="flex flex-col rounded-[20px] bg-[#f1ece2] p-5 lg:min-h-[500px]">
            <strong className="flex items-center gap-2 text-lg tracking-[-.03em]">
              <span className="brand-mark" /> rukai
            </strong>
            <div className="mt-10">
              <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#b45c2a]">
                Clase guiada
              </p>
              <h1 className="mt-2 font-serif text-xl leading-tight">
                {lesson.title}
              </h1>
              <p className="mt-3 text-[10px] uppercase tracking-[.12em] text-black/45">
                {lesson.slides[slideIndex].phase === "intro"
                  ? "Introducción"
                  : lesson.slides[slideIndex].phase === "closing"
                    ? "Cierre"
                    : "Contenido"}{" "}
                · {String(slideIndex + 1).padStart(2, "0")} /{" "}
                {String(lesson.slides.length).padStart(2, "0")}
              </p>
              <div className="mt-3 grid grid-flow-col gap-1">
                {lesson.slides.map((_, index) => (
                  <span
                    className={`h-[3px] rounded-full ${started && index <= slideIndex ? "bg-[#c8672e]" : "bg-black/10"}`}
                    key={index}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 border-y border-black/10 py-4">
              <span
                className={`voice-dot grid size-9 shrink-0 place-items-center rounded-full ${state === "playing" && !muted ? "is-playing bg-[#c8672e]/10 text-[#c8672e]" : "bg-black/5 text-black/45"}`}
              >
                {muted ? <SpeakerOffIcon /> : <SpeakerLoudIcon />}
              </span>
              <span>
                <strong className="block text-xs">{status}</strong>
                <small className="block text-[9px] text-black/45">
                  Voz generada por IA
                </small>
              </span>
            </div>

            <div className="mt-6 grid gap-5">
              {lesson.voices.length > 1 && (
                <label className="grid gap-2 text-[9px] font-bold uppercase tracking-[.12em] text-black/45">
                  Voz
                  <select
                    className="h-10 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold capitalize text-black outline-none focus:ring-2 focus:ring-[#c8672e]/35"
                    value={voice}
                    onChange={(event) => {
                      setVoice(event.target.value);
                      if (started) void narrate(slideIndex, event.target.value);
                    }}
                  >
                    {lesson.voices.map((option) => (
                      <option value={option} key={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="mt-7 grid gap-2 lg:mt-auto">
              <Button
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl bg-transparent"
                onClick={toggleMute}
              >
                {muted ? <SpeakerLoudIcon /> : <SpeakerOffIcon />}
                {muted ? "Activar narración" : "Silenciar narración"}
              </Button>
              <Button
                className="h-11 w-full gap-2 rounded-xl"
                onClick={() => void toggleAudio()}
                disabled={!started || state === "loading" || state === "error"}
              >
                {state === "playing" ? <PauseIcon /> : <PlayIcon />}
                {state === "playing"
                  ? "Pausar narración"
                  : "Reanudar narración"}
              </Button>
            </div>
          </aside>

          <div className="lesson-canvas group relative min-h-[500px] overflow-hidden rounded-[20px] bg-[#17120d] text-[#fffaf0] sm:aspect-video">
            <div className="h-full">
              <SlideScene
                slide={lesson.slides[slideIndex]}
                currentTime={currentTime}
                theme={lesson.theme}
              />
            </div>

            {started && (
              <div className="slide-interactive absolute right-4 top-4 z-20 opacity-60 transition-opacity md:opacity-0 md:group-hover:opacity-60 md:group-focus-within:opacity-100">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-full border-white/20 bg-black/30 text-white/70 hover:bg-black/55 hover:text-white"
                  onClick={restartSlide}
                  disabled={state === "loading"}
                  aria-label="Reiniciar diapositiva"
                >
                  <StopIcon />
                </Button>
              </div>
            )}

            {!started && (
              <div
                className="absolute inset-0 z-10 grid content-end gap-7 bg-cover bg-center p-[clamp(2rem,6vw,4.5rem)] md:grid-cols-[1fr_auto] md:items-end"
                style={{
                  backgroundImage: lesson.slides[0].imageUrl
                    ? `linear-gradient(90deg,rgba(15,9,5,.97),rgba(15,9,5,.5)),url("${lesson.slides[0].imageUrl}")`
                    : "linear-gradient(120deg,#2f1b0f,#0f0d0b)",
                }}
              >
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#dfa763]">
                    Clase guiada
                  </p>
                  <h2 className="max-w-3xl text-balance font-serif text-[clamp(2.6rem,6vw,5rem)] font-normal leading-[.95] tracking-[-.055em]">
                    {lesson.title}
                  </h2>
                  <p className="mt-5 text-sm text-white/55">
                    {lesson.slides.length} diapositivas · Timeline interactivo
                  </p>
                </div>
                <Button
                  size="lg"
                  className="h-14 gap-2 rounded-full bg-[#df7c3d] px-8 text-[#160e08] hover:bg-[#ef955b]"
                  onClick={() => {
                    setStarted(true);
                    void narrate(0);
                  }}
                >
                  <PlayIcon /> Empezar
                </Button>
              </div>
            )}

            {started && state !== "loading" && state !== "error" && (
              <Timeline
                events={lesson.slides[slideIndex].events}
                currentTime={currentTime}
                duration={duration}
                maxReachedTime={maxReachedTime}
                playing={state === "playing"}
                onToggle={() => void toggleAudio()}
                onSeek={seekTo}
              />
            )}

            {interactionVisible && interaction && (
              <InteractionPanel
                interaction={interaction}
                completed={interactionCompleted}
                selectedOptions={selectedOptions}
                narrationFinished={narrationFinishedRef.current}
                onToggleOption={toggleOption}
                onSubmit={completeInteraction}
              />
            )}

            {feedbackVisible && (
              <FeedbackSummary lesson={lesson} responses={responses} />
            )}

            {error && (
              <div className="absolute inset-x-4 bottom-24 z-40 flex flex-col gap-3 rounded-xl border border-red-200/20 bg-[#4a1f16]/95 p-3 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-white/20 bg-white/5 text-white"
                  onClick={() => void narrate(slideIndex)}
                >
                  <ReloadIcon /> Reintentar
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-2xl border border-black/10 bg-[#faf8f2]/90 px-4 py-3 shadow-sm backdrop-blur-sm">
      <p className="text-[9px] font-bold uppercase tracking-[.14em] text-black/40">
        {label}
      </p>
      <strong className="mt-1 block text-lg tracking-[-.025em]">{value}</strong>
      {detail && (
        <small
          className="mt-1 block truncate text-[10px] text-black/45"
          title={detail}
        >
          {detail}
        </small>
      )}
    </article>
  );
}
