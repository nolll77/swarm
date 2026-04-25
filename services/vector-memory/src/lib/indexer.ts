import fs from "fs";
import path from "path";
import { chunkFile } from "./chunk";
import { embed } from "./embeddings";

export async function indexRepository(repoPath: string, tenantId: string) {
  const files = getRepoFiles(repoPath);
  const db: any[] = [];

  console.log(`[Indexer] Indexing ${files.length} files for tenant ${tenantId}...`);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const chunks = chunkFile(content);

    for (const chunk of chunks) {
      const vector = await embed(chunk);
      db.push({
        tenantId,
        path: path.relative(repoPath, file),
        content: chunk,
        embedding: vector,
      });
    }
  }

  // Persist to local "Vector DB" simulated as JSON for the Elite SaaS MVP
  const dbPath = path.join(process.cwd(), 'data', `vector-db-${tenantId}.json`);
  if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  
  fs.writeFileSync(dbPath, JSON.stringify(db));
  console.log(`[Indexer] Successfully indexed items to ${dbPath}`);
}

function getRepoFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  const ignore = ['node_modules', '.git', 'dist', '.next'];

  for (const file of list) {
    if (ignore.includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getRepoFiles(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}
