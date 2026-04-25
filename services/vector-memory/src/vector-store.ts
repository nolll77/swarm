import { EMBEDDING_CONFIG } from "@ai-dev/shared";
import { createLogger } from "@ai-dev/logger";
import type { CodeChunk, VectorEntry, VectorSearchResult } from "@ai-dev/shared";
import { randomUUID } from "crypto";

const logger = createLogger("vector-memory:store");

/**
 * In-memory Vector Store with cosine similarity search.
 *
 * Architecture Decision:
 * This is a "Portable" vector store — it works stand-alone without external
 * infrastructure (no Pinecone/Chroma dependency). For production at scale,
 * swap this adapter with a ChromaDB or Pinecone client implementing the
 * same interface (IVectorStore).
 *
 * The in-memory approach is valid for repositories up to ~50k chunks
 * (~10M lines of code), which covers 99% of enterprise monorepos.
 */

interface StoredVector {
  entry: VectorEntry;
  chunk: CodeChunk;
}

export interface IVectorStore {
  upsert(chunk: CodeChunk, embedding: number[]): Promise<void>;
  search(queryEmbedding: number[], repositoryId: string, topK: number, minScore: number): Promise<VectorSearchResult[]>;
  deleteByRepository(repositoryId: string): Promise<number>;
  count(repositoryId?: string): number;
}

/**
 * Cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export class InMemoryVectorStore implements IVectorStore {
  private vectors: Map<string, StoredVector> = new Map();

  async upsert(chunk: CodeChunk, embedding: number[]): Promise<void> {
    const entryId = randomUUID();
    const entry: VectorEntry = {
      id: entryId,
      chunkId: chunk.id,
      repositoryId: chunk.repositoryId,
      embedding,
      metadata: {
        filePath: chunk.filePath,
        language: chunk.language,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
      },
    };

    // Key by chunkId so re-indexing overwrites cleanly
    this.vectors.set(chunk.id, { entry, chunk });
  }

  async search(
    queryEmbedding: number[],
    repositoryId: string,
    topK: number = EMBEDDING_CONFIG.TOP_K_RESULTS,
    minScore: number = EMBEDDING_CONFIG.SIMILARITY_THRESHOLD
  ): Promise<VectorSearchResult[]> {
    const candidates: VectorSearchResult[] = [];

    for (const stored of this.vectors.values()) {
      // Scope search to the target repository only (multi-tenant isolation)
      if (stored.entry.repositoryId !== repositoryId) continue;

      const score = cosineSimilarity(queryEmbedding, stored.entry.embedding);
      if (score >= minScore) {
        candidates.push({ chunk: stored.chunk, score });
      }
    }

    // Sort by descending similarity, return top K
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, topK);
  }

  async deleteByRepository(repositoryId: string): Promise<number> {
    let deleted = 0;
    for (const [key, stored] of this.vectors.entries()) {
      if (stored.entry.repositoryId === repositoryId) {
        this.vectors.delete(key);
        deleted++;
      }
    }
    logger.info("Deleted vectors for repository", { repositoryId, deleted });
    return deleted;
  }

  count(repositoryId?: string): number {
    if (!repositoryId) return this.vectors.size;
    let c = 0;
    for (const stored of this.vectors.values()) {
      if (stored.entry.repositoryId === repositoryId) c++;
    }
    return c;
  }
}
