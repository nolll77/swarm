import OpenAI from "openai";
import { EMBEDDING_CONFIG } from "@ai-dev/shared";
import { createLogger } from "@ai-dev/logger";

const logger = createLogger("vector-memory:embedder");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates a vector embedding for a single text string.
 * Uses OpenAI's text-embedding-3-small (1536 dimensions, fast, cheap).
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_CONFIG.MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Batch-embeds multiple texts in a single API call.
 * OpenAI supports up to 2048 inputs per request.
 * We internally batch at 100 to balance latency and cost.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    logger.debug("Embedding batch", {
      batchIndex: Math.floor(i / BATCH_SIZE),
      batchSize: batch.length,
      totalTexts: texts.length,
    });

    const response = await openai.embeddings.create({
      model: EMBEDDING_CONFIG.MODEL,
      input: batch,
    });

    // Sort by index to maintain order (OpenAI may return out of order)
    const sorted = response.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map((d) => d.embedding));
  }

  return allEmbeddings;
}
