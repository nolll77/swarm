import { embed } from "./embeddings";

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export async function searchRelevant(query: string, vectorDb: any[], topK = 5) {
  const queryVector = await embed(query);
  
  const scored = vectorDb.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.embedding),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
