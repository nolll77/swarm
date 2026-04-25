import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embed(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback mock vector for demo purposes
    return new Array(1536).fill(0).map(() => Math.random());
  }

  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return res.data[0].embedding;
}
