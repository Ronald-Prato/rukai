import { describe, expect, test } from "bun:test";
import { synchronizeEvents } from "../convex/synchronizeEvents";

const words = [
  { word: "Arrakis", start: 0.12, end: 0.6 },
  { word: "produce", start: 0.72, end: 1.1 },
  { word: "la", start: 1.2344, end: 1.4 },
  { word: "especia", start: 1.46, end: 2.02 },
];

describe("narration event synchronization", () => {
  test("uses the semantically aligned word timestamp with millisecond precision", () => {
    const events = synchronizeEvents(
      [{ id: "visual", label: "Especia", kind: "reveal" }],
      words,
      [{ id: "visual", wordIndex: 2 }],
    );

    expect(events).toEqual([
      { id: "visual", at: 1.234, label: "Especia", kind: "reveal" },
    ]);
  });

  test("sorts reveals by their audio position", () => {
    const events = synchronizeEvents(
      [
        { id: "title", label: "Título", kind: "reveal" },
        { id: "eyebrow", label: "Contexto", kind: "reveal" },
      ],
      words,
      [
        { id: "title", wordIndex: 3 },
        { id: "eyebrow", wordIndex: 0 },
      ],
    );

    expect(events.map((event) => event.id)).toEqual(["eyebrow", "title"]);
  });

  test("rejects missing, duplicate, and out-of-range alignments", () => {
    const events = [
      { id: "visual", label: "Especia", kind: "reveal" },
    ] as const;

    expect(() => synchronizeEvents(events, words, [])).toThrow(
      "no incluyó visual",
    );
    expect(() =>
      synchronizeEvents(events, words, [
        { id: "visual", wordIndex: 1 },
        { id: "visual", wordIndex: 2 },
      ]),
    ).toThrow("IDs de evento repetidos");
    expect(() =>
      synchronizeEvents(events, words, [{ id: "visual", wordIndex: 99 }]),
    ).toThrow("palabra inexistente");
  });
});
