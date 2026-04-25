import { EMBEDDING_CONFIG } from "@ai-dev/shared";
import { createLogger } from "@ai-dev/logger";
import type { CodeChunk } from "@ai-dev/shared";
import { randomUUID } from "crypto";

const logger = createLogger("vector-memory:chunker");

/**
 * Language-aware file extensions that should be indexed.
 * Binary, lock, and generated files are excluded by design.
 */
const INDEXABLE_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".rb": "ruby",
  ".css": "css",
  ".scss": "scss",
  ".html": "html",
  ".md": "markdown",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".json": "json",
  ".sql": "sql",
  ".prisma": "prisma",
  ".tf": "terraform",
  ".Dockerfile": "dockerfile",
};

const IGNORED_PATHS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "__pycache__",
  ".turbo",
  "legacy",
];

/**
 * Determines if a file path should be indexed based on extension and path.
 */
export function isIndexable(filePath: string): boolean {
  if (IGNORED_PATHS.some((ignored) => filePath.includes(ignored))) return false;
  const ext = filePath.substring(filePath.lastIndexOf("."));
  return ext in INDEXABLE_EXTENSIONS;
}

/**
 * Detects language from a file extension.
 */
export function detectLanguage(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf("."));
  return INDEXABLE_EXTENSIONS[ext] || "unknown";
}

/**
 * Splits a file's content into overlapping semantic chunks.
 *
 * Strategy: Line-aware chunking with configurable overlap.
 * Unlike naive character splitting, this respects line boundaries so we never
 * cut a function signature or import statement in half.
 */
export function chunkFileContent(
  repositoryId: string,
  filePath: string,
  content: string
): CodeChunk[] {
  const language = detectLanguage(filePath);
  const lines = content.split("\n");
  const chunks: CodeChunk[] = [];

  const charsPerChunk = EMBEDDING_CONFIG.CHUNK_SIZE;
  const overlapChars = EMBEDDING_CONFIG.CHUNK_OVERLAP;

  let currentChunkLines: string[] = [];
  let currentChunkStart = 1;
  let currentCharCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentChunkLines.push(line);
    currentCharCount += line.length + 1; // +1 for newline

    if (currentCharCount >= charsPerChunk || i === lines.length - 1) {
      const chunkContent = currentChunkLines.join("\n");

      // Only index non-trivial chunks (skip empty files / whitespace-only blocks)
      if (chunkContent.trim().length > 20) {
        chunks.push({
          id: randomUUID(),
          repositoryId,
          filePath,
          content: chunkContent,
          startLine: currentChunkStart,
          endLine: currentChunkStart + currentChunkLines.length - 1,
          language,
          metadata: {
            charCount: chunkContent.length,
            lineCount: currentChunkLines.length,
          },
        });
      }

      if (chunks.length >= EMBEDDING_CONFIG.MAX_CHUNKS_PER_FILE) {
        logger.warn("Max chunks per file reached, truncating", { filePath, maxChunks: EMBEDDING_CONFIG.MAX_CHUNKS_PER_FILE });
        break;
      }

      // Calculate overlap: keep the last N characters worth of lines
      const overlapLines: string[] = [];
      let overlapCount = 0;
      for (let j = currentChunkLines.length - 1; j >= 0 && overlapCount < overlapChars; j--) {
        overlapLines.unshift(currentChunkLines[j]);
        overlapCount += currentChunkLines[j].length + 1;
      }

      currentChunkStart = currentChunkStart + currentChunkLines.length - overlapLines.length;
      currentChunkLines = [...overlapLines];
      currentCharCount = overlapCount;
    }
  }

  logger.debug("File chunked", { filePath, chunks: chunks.length });
  return chunks;
}
