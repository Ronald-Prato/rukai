import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";

const MAX_PROMPT_LENGTH = 2_000;

async function normalizeClassId(ctx: QueryCtx, id: string) {
  return ctx.db.normalizeId("classes", id);
}

export const list = query({
  args: {},
  handler: (ctx) =>
    ctx.db.query("classes").withIndex("by_updatedAt").order("desc").take(12),
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const classId = await normalizeClassId(ctx, args.id);
    if (!classId) return null;
    const lesson = await ctx.db.get("classes", classId);
    if (!lesson) return null;

    const slides = await ctx.db
      .query("classSlides")
      .withIndex("by_classId_and_order", (q) => q.eq("classId", classId))
      .order("asc")
      .take(12);

    return {
      ...lesson,
      slides: await Promise.all(
        slides.map(async (slide) => ({
          ...slide,
          imageUrl: slide.imageStorageId
            ? await ctx.storage.getUrl(slide.imageStorageId)
            : null,
          audioUrl: await ctx.storage.getUrl(slide.audioStorageId),
        })),
      ),
    };
  },
});

export const logs = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const classId = await normalizeClassId(ctx, args.id);
    if (!classId) return [];
    return ctx.db
      .query("classGenerationLogs")
      .withIndex("by_classId_and_createdAt", (q) => q.eq("classId", classId))
      .order("asc")
      .take(30);
  },
});

export const getPrompt = internalQuery({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get("classes", args.classId);
    return lesson ? { prompt: lesson.prompt } : null;
  },
});

export const create = mutation({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    const prompt = args.prompt.trim();
    if (prompt.length < 10) {
      throw new Error(
        "Describe el tema de la clase con al menos 10 caracteres.",
      );
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(
        `El prompt no puede superar ${MAX_PROMPT_LENGTH} caracteres.`,
      );
    }

    const now = Date.now();
    const classId = await ctx.db.insert("classes", {
      title: "Nueva clase",
      prompt,
      status: "queued",
      currentStep: "En cola",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("classGenerationLogs", {
      classId,
      label: "En cola",
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.generateLesson.run, { classId });
    return classId;
  },
});

export const remove = mutation({
  args: { id: v.id("classes") },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get("classes", args.id);
    if (!lesson) return null;

    const slides = await ctx.db
      .query("classSlides")
      .withIndex("by_classId_and_order", (q) => q.eq("classId", args.id))
      .take(12);
    const logs = await ctx.db
      .query("classGenerationLogs")
      .withIndex("by_classId_and_createdAt", (q) => q.eq("classId", args.id))
      .take(50);

    for (const slide of slides) {
      if (slide.imageStorageId) {
        await ctx.storage.delete(slide.imageStorageId);
      }
      await ctx.storage.delete(slide.audioStorageId);
      await ctx.db.delete("classSlides", slide._id);
    }
    for (const log of logs) {
      await ctx.db.delete("classGenerationLogs", log._id);
    }
    await ctx.db.delete("classes", args.id);
    return null;
  },
});

export const beginGeneration = internalMutation({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch("classes", args.classId, {
      status: "generating",
      currentStep: "Diseñando la clase",
      startedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("classGenerationLogs", {
      classId: args.classId,
      label: "Diseñando la clase",
      createdAt: now,
    });
  },
});

export const recordStep = internalMutation({
  args: { classId: v.id("classes"), label: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch("classes", args.classId, {
      currentStep: args.label,
      updatedAt: now,
    });
    await ctx.db.insert("classGenerationLogs", {
      classId: args.classId,
      label: args.label,
      createdAt: now,
    });
  },
});

const eventValidator = v.object({
  id: v.string(),
  at: v.number(),
  label: v.string(),
  kind: v.union(v.literal("reveal"), v.literal("interaction")),
});

export const saveSlide = internalMutation({
  args: {
    classId: v.id("classes"),
    order: v.number(),
    phase: v.union(v.literal("intro"), v.literal("topic")),
    layout: v.union(
      v.literal("hero"),
      v.literal("split"),
      v.literal("focus"),
      v.literal("cards"),
      v.literal("chain"),
    ),
    tone: v.union(
      v.literal("dark"),
      v.literal("light"),
      v.literal("accent"),
      v.literal("muted"),
    ),
    visualKind: v.union(
      v.literal("image"),
      v.literal("list"),
      v.literal("stats"),
      v.literal("chart"),
      v.literal("table"),
      v.literal("diagram"),
    ),
    eyebrow: v.string(),
    title: v.string(),
    body: v.string(),
    narration: v.string(),
    facts: v.array(v.string()),
    content: v.array(
      v.object({
        label: v.string(),
        value: v.string(),
        detail: v.string(),
      }),
    ),
    events: v.array(eventValidator),
    imageStorageId: v.optional(v.id("_storage")),
    audioStorageId: v.id("_storage"),
    audioDurationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get("classes", args.classId);
    if (!lesson) return null;
    return ctx.db.insert("classSlides", args);
  },
});

export const completeGeneration = internalMutation({
  args: {
    classId: v.id("classes"),
    title: v.string(),
    summary: v.string(),
    theme: v.union(
      v.literal("ember-ocean"),
      v.literal("plum-sage"),
      v.literal("cobalt-sand"),
    ),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    costUsd: v.number(),
    models: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get("classes", args.classId);
    if (!lesson) return null;
    const now = Date.now();
    const startedAt = lesson.startedAt ?? lesson.createdAt;
    await ctx.db.patch("classes", args.classId, {
      title: args.title,
      summary: args.summary,
      theme: args.theme,
      status: "ready",
      currentStep: "Clase lista",
      completedAt: now,
      updatedAt: now,
      generationDurationMs: now - startedAt,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      costUsd: args.costUsd,
      models: args.models,
      usageEstimated: true,
      slideCount: 5,
    });
    await ctx.db.insert("classGenerationLogs", {
      classId: args.classId,
      label: "Clase lista",
      createdAt: now,
    });
    return null;
  },
});

export const failGeneration = internalMutation({
  args: { classId: v.id("classes"), error: v.string() },
  handler: async (ctx, args) => {
    const slides = await ctx.db
      .query("classSlides")
      .withIndex("by_classId_and_order", (q) => q.eq("classId", args.classId))
      .take(12);
    for (const slide of slides) await ctx.db.delete("classSlides", slide._id);

    const lesson = await ctx.db.get("classes", args.classId);
    if (!lesson) return null;

    const now = Date.now();
    await ctx.db.patch("classes", args.classId, {
      status: "failed",
      currentStep: "La generación falló",
      error: args.error,
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("classGenerationLogs", {
      classId: args.classId,
      label: `La generación falló: ${args.error}`,
      createdAt: now,
    });
  },
});
