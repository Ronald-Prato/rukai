import { query } from "./_generated/server";

export const list = query({
  args: {},
  handler: (ctx) =>
    ctx.db.query("classes").withIndex("by_updatedAt").order("desc").take(6),
});
