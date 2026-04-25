import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { InMemoryVectorStore } from "./vector-store";
import { indexRepository, queryContext, RepoFile } from "./indexer";

dotenv.config();

const logger = createLogger("vector-memory");
const eventBus = getEventBus();

// Singleton vector store instance for this process.
// In a multi-replica deployment, swap InMemoryVectorStore for a shared
// external store (ChromaDB, Pinecone, Weaviate) via the IVectorStore interface.
const vectorStore = new InMemoryVectorStore();

async function start() {
  logger.info("Vector Memory Engine starting...");

  // --- Event 1: Index a repository on demand ---
  // Triggered when a new repository is added, or when code is merged.
  await eventBus.subscribe(
    TOPICS.REPO_INDEX_REQUESTED,
    "vector-memory-group",
    "vector-indexer-1",
    async (event) => {
      const { repositoryId, tenantId, files } = event.payload as {
        repositoryId: string;
        tenantId: string;
        files: RepoFile[];
      };

      logger.info("Indexing repository", { repositoryId, fileCount: files.length });

      try {
        const result = await indexRepository(repositoryId, files, vectorStore);

        // Persist indexing stats to the audit log for compliance
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: "vector_index_completed",
            actor: "system",
            details: {
              repositoryId,
              filesProcessed: result.filesProcessed,
              chunksIndexed: result.chunksIndexed,
              totalVectors: vectorStore.count(repositoryId),
            },
          },
        });

        await eventBus.publish(TOPICS.REPO_INDEX_COMPLETED, tenantId, {
          repositoryId,
          tenantId,
          ...result,
        }, event.correlationId);

        logger.info("Repository indexed successfully", { repositoryId, ...result });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error("Repository indexing failed", { repositoryId, error: errorMsg });
      }
    }
  );

  // --- Event 2: Answer semantic queries from agents ---
  // Agents (Planner, Coder) publish a query, and this service responds
  // with the most relevant code chunks from the repository's vector index.
  await eventBus.subscribe(
    TOPICS.VECTOR_QUERY_REQUESTED,
    "vector-memory-group",
    "vector-query-1",
    async (event) => {
      const { query, repositoryId, taskId, tenantId, topK, minScore } = event.payload as any;

      logger.info("Processing vector query", { query: query?.substring(0, 80), repositoryId, taskId });

      try {
        const results = await queryContext(
          { query, repositoryId, topK, minScore },
          vectorStore
        );

        // Emit results back on the event bus for the requesting agent to consume
        await eventBus.publish(TOPICS.VECTOR_QUERY_RESULT, tenantId, {
          taskId,
          tenantId,
          repositoryId,
          query,
          results: results.map((r) => ({
            filePath: r.chunk.filePath,
            content: r.chunk.content,
            startLine: r.chunk.startLine,
            endLine: r.chunk.endLine,
            language: r.chunk.language,
            score: r.score,
          })),
          resultCount: results.length,
        }, event.correlationId);

        logger.info("Vector query served", {
          taskId,
          resultsReturned: results.length,
          topScore: results[0]?.score ?? 0,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error("Vector query failed", { taskId, error: errorMsg });
      }
    }
  );

  logger.info("Vector Memory Engine ready", {
    storeType: "InMemoryVectorStore",
    note: "Swap to ChromaDB/Pinecone via IVectorStore interface for production scale",
  });
}

start().catch((err) => {
  logger.fatal("Vector Memory Engine failed to start", { error: err.message });
  process.exit(1);
});
