import OpenAI from "openai";

export class CoderAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generatePatch(plan: string, context: any): Promise<string> {
    const prompt = `
      You are a senior developer. 
      Based on the plan below, generate the necessary code changes.
      
      Plan: ${plan}
      Target Repo: ${context.repo}
      
      Output ONLY the code diff or file content changes. No explanations.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    return response.choices[0].message.content || "";
  }
}
