export type AuthoredEvent = {
  id: string;
  label: string;
  kind: "reveal" | "interaction";
};

export type EventAlignment = {
  id: string;
  wordIndex: number;
};

export type TimedWord = {
  word: string;
  start: number;
  end: number;
};

export function synchronizeEvents(
  events: readonly AuthoredEvent[],
  words: readonly TimedWord[],
  alignments: readonly EventAlignment[],
) {
  if (!words.length) {
    throw new Error(
      "OpenAI no devolvió palabras temporizadas para la narración.",
    );
  }

  const eventIds = events.map((event) => event.id);
  const alignmentIds = alignments.map((alignment) => alignment.id);
  if (new Set(alignmentIds).size !== alignmentIds.length) {
    throw new Error("La alineación contiene IDs de evento repetidos.");
  }

  const missingIds = eventIds.filter((id) => !alignmentIds.includes(id));
  if (missingIds.length) {
    throw new Error(`La alineación no incluyó ${missingIds.join(", ")}.`);
  }

  const unexpectedIds = alignmentIds.filter((id) => !eventIds.includes(id));
  if (unexpectedIds.length) {
    throw new Error(
      `La alineación incluyó ${unexpectedIds.join(", ")} de más.`,
    );
  }

  const alignmentById = new Map(
    alignments.map((alignment) => [alignment.id, alignment.wordIndex]),
  );

  return events
    .map((event, eventIndex) => {
      const wordIndex = alignmentById.get(event.id);
      if (
        !Number.isInteger(wordIndex) ||
        wordIndex === undefined ||
        wordIndex < 0 ||
        wordIndex >= words.length
      ) {
        throw new Error(
          `La alineación de ${event.id} apunta a una palabra inexistente.`,
        );
      }

      return {
        id: event.id,
        at: Math.round(words[wordIndex].start * 1_000) / 1_000,
        label: event.label,
        kind: event.kind,
        eventIndex,
      };
    })
    .sort(
      (left, right) => left.at - right.at || left.eventIndex - right.eventIndex,
    )
    .map(({ eventIndex: _eventIndex, ...event }) => event);
}
