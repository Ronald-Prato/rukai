import { describe, expect, test } from "bun:test";
import {
  canContinueFromInteraction,
  clampSeekTime,
  formatPlaybackTime,
  visibleEventIds,
} from "../src/presentation";

describe("presentation timeline", () => {
  const events = [
    { id: "title", at: 0.5, label: "Título" },
    { id: "chart", at: 3, label: "Gráfica" },
    {
      id: "question",
      at: 5,
      label: "Pregunta",
      kind: "interaction" as const,
    },
  ];

  test("derives the scene from media time", () => {
    expect([...visibleEventIds(events, 3)]).toEqual(["title", "chart"]);
  });

  test("removes future events after rewinding", () => {
    expect([...visibleEventIds(events, 5)]).toEqual([
      "title",
      "chart",
      "question",
    ]);
    expect([...visibleEventIds(events, 2)]).toEqual(["title"]);
  });

  test("does not seek beyond content already reached", () => {
    expect(clampSeekTime(8, 4.5, 12)).toBe(4.5);
    expect(clampSeekTime(3, 4.5, 12)).toBe(3);
    expect(clampSeekTime(-2, 4.5, 12)).toBe(0);
  });

  test("continues only after narration and interaction are both complete", () => {
    expect(canContinueFromInteraction(false, false)).toBe(false);
    expect(canContinueFromInteraction(false, true)).toBe(false);
    expect(canContinueFromInteraction(true, false)).toBe(false);
    expect(canContinueFromInteraction(true, true)).toBe(true);
  });

  test("formats player time", () => {
    expect(formatPlaybackTime(65.9)).toBe("1:05");
    expect(formatPlaybackTime(Number.NaN)).toBe("0:00");
  });
});
