import { mkdir } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { slides, voices } from "../src/presentation";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");

const client = new OpenAI({ apiKey });
const outputRoot = path.resolve(import.meta.dir, "../public/narrations");
const force = process.argv.includes("--force");
const instructions =
  "Habla en español latino neutro, con una voz cálida, clara y pedagógica. Mantén un ritmo sereno y cinematográfico, con pausas naturales.";

for (const voice of voices) {
  const voiceDirectory = path.join(outputRoot, voice);
  await mkdir(voiceDirectory, { recursive: true });

  for (const [slideIndex, slide] of slides.entries()) {
    const outputPath = path.join(voiceDirectory, `slide-${slideIndex + 1}.mp3`);
    const file = Bun.file(outputPath);
    if (!force && (await file.exists())) {
      console.log(`Ya existe: ${path.relative(process.cwd(), outputPath)}`);
      continue;
    }

    console.log(
      `Generando ${voice} · diapositiva ${slideIndex + 1}/${slides.length}…`,
    );
    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: slide.narration,
      instructions,
      response_format: "mp3",
    });
    await Bun.write(outputPath, await speech.arrayBuffer());
  }
}

console.log("Narraciones listas.");
