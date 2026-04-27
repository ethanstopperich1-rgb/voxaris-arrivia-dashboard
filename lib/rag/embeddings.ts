import { openai } from "@/lib/clients/openai";
import { MODELS } from "@/lib/config/constants";

export async function embedQuery(text: string): Promise<number[]> {
  const res = await openai().embeddings.create({
    model: MODELS.EMBEDDING,
    input: text,
  });
  return res.data[0]!.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const res = await openai().embeddings.create({
    model: MODELS.EMBEDDING,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
