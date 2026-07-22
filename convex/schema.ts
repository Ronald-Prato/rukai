import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const interaction = v.object({
  kind: v.union(
    v.literal("ready"),
    v.literal("single_choice"),
    v.literal("true_false"),
    v.literal("multiple_choice"),
  ),
  prompt: v.string(),
  ctaLabel: v.string(),
  options: v.array(v.string()),
  correctOptionIndexes: v.array(v.number()),
  explanation: v.string(),
});

export default defineSchema({
  classes: defineTable({
    title: v.string(),
    prompt: v.string(),
    summary: v.optional(v.string()),
    theme: v.optional(
      v.union(
        v.literal("ember-ocean"),
        v.literal("plum-sage"),
        v.literal("cobalt-sand"),
      ),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    currentStep: v.string(),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
    error: v.optional(v.string()),
    generationDurationMs: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    models: v.optional(v.array(v.string())),
    usageEstimated: v.optional(v.boolean()),
    slideCount: v.optional(v.number()),
  }).index("by_updatedAt", ["updatedAt"]),
  classSlides: defineTable({
    classId: v.id("classes"),
    order: v.number(),
    phase: v.union(
      v.literal("intro"),
      v.literal("content"),
      v.literal("closing"),
      v.literal("topic"),
    ),
    layout: v.union(
      v.literal("hero"),
      v.literal("split"),
      v.literal("focus"),
      v.literal("cards"),
      v.literal("chain"),
    ),
    tone: v.optional(
      v.union(
        v.literal("dark"),
        v.literal("light"),
        v.literal("accent"),
        v.literal("muted"),
      ),
    ),
    visualKind: v.optional(
      v.union(
        v.literal("image"),
        v.literal("list"),
        v.literal("stats"),
        v.literal("chart"),
        v.literal("table"),
        v.literal("diagram"),
      ),
    ),
    eyebrow: v.string(),
    title: v.string(),
    body: v.string(),
    narration: v.string(),
    facts: v.array(v.string()),
    content: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.string(),
          detail: v.string(),
        }),
      ),
    ),
    events: v.array(
      v.object({
        id: v.string(),
        at: v.number(),
        label: v.string(),
        kind: v.union(v.literal("reveal"), v.literal("interaction")),
      }),
    ),
    interaction: v.optional(interaction),
    imageStorageId: v.optional(v.id("_storage")),
    audioStorageId: v.id("_storage"),
    audioDurationSeconds: v.number(),
  }).index("by_classId_and_order", ["classId", "order"]),
  classGenerationLogs: defineTable({
    classId: v.id("classes"),
    label: v.string(),
    createdAt: v.number(),
  }).index("by_classId_and_createdAt", ["classId", "createdAt"]),
});
