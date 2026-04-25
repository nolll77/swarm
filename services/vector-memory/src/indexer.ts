import { createLogger } from "@ai-dev/logger";
import type { CodeChunk, VectorSearchResult, VectorQueryRequest } from "@ai-dev/shared";
import { EMBEDDING_CONFIG } from "@ai-dev/shared";
import { chunkFileContent, isIndexable } from "./chunker";
import { embedText, embedBatch } from "./embedder";
import { IVectorStore } from "./vector-store";

const logger = createLogger("vector-memory:indexer");

/**
 * File representation fetched from the repository source.
 * In production, this comes from the GitHub API (contents endpoint).
 * For the bootstrapped architecture, we define the interface.
 */
export interface RepoFile {
  path: string;
  content: string;
}

/**
 * Full Indexing Pipeline: Files → Chunks → Embeddings → Vector Store
 *
 * This is the "brain loader" — it takes raw repository files and converts them
 * into a searchable semantic knowledge base that agents can query.
 */
export async function indexRepository(
  repositoryId: string,
  files: RepoFile[],
  store: IVectorStore
): Promise<{ chunksIndexed: number; filesProcessed: number }> {
  logger.info("Starting repository indexing", { repositoryId, totalFiles: files.length });

  // Step 1: Filter to indexable files only
  const indexableFiles = files.filter((f) => isIndexable(f.path));
  logger.info("Filtered indexable files", { total: files.length, indexable: indexableFiles.length });

  // Step 2: Clear previous index for this repo (full re-index strategy)
  const deleted = await store.deleteByRepository(repositoryId);
  if (deleted > 0) {
    logger.info("Cleared previous index", { repositoryId, deletedChunks: deleted });
  }

  // Step 3: Chunk all files
  const allChunks: CodeChunk[] = [];
  for (const file of indexableFiles) {
    const chunks = chunkFileContent(repositoryId, file.path, file.content);
    allChunks.push(...chunks);
  }

  logger.info("Chunking complete", { totalChunks: allChunks.length });

  if (allChunks.length === 0) {
    logger.warn("No indexable chunks found", { repositoryId });
    return { chunksIndexed: 0, filesProcessed: indexableFiles.length };
  }

  // Step 4: Batch embed all chunks
  const texts = allChunks.map((c) => c.content);
  const embeddings = await embedBatch(texts);

  // Step 5: Upsert into vector store
  for (let i = 0; i < allChunks.length; i++) {
    await store.upsert(allChunks[i], embeddings[i]);
  }

  logger.info("Repository indexing complete", {
    repositoryId,
    filesProcessed: indexableFiles.length,
    chunksIndexed: allChunks.length,
    totalVectors: store.count(repositoryId),
  });

  return { chunksIndexed: allChunks.length, filesProcessed: indexableFiles.length };
}

/**
 * Semantic Query: Search the vector store for code relevant to a natural language query.
 *
 * This is what agents call before generating plans or code.
 * Example queries:
 *   - "How does authentication work in this project?"
 *   - "Where is the database connection configured?"
 *   - "Show me the error handling patterns used here"
 */
export async function queryContext(
  request: VectorQueryRequest,
  store: IVectorStore
): Promise<VectorSearchResult[]> {
  const { query, repositoryId, topK, minScore } = request;

  logger.info("Querying vector memory", { query: query.substring(0, 80), repositoryId });

  // Embed the natural language query
  const queryEmbedding = await embedText(query);

  // Search the store
  const results = await store.search(
    queryEmbedding,
    repositoryId,
    topK ?? EMBEDDING_CONFIG.TOP_K_RESULTS,
    minScore ?? EMBEDDING_CONFIG.SIMILARITY_THRESHOLD
  );

  logger.info("Query results", {
    query: query.substring(0, 80),
    resultsFound: results.length,
    topScore: results[0]?.score ?? 0,
  });

  return results;
}
