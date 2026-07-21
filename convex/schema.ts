import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  classes: defineTable({
    title: v.string(),
    status: v.union(v.literal("draft"), v.literal("ready")),
    updatedAt: v.number(),
  }).index("by_updatedAt", ["updatedAt"]),
});
