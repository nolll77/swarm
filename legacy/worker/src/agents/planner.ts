import OpenAI from "openai";

export class PlannerAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generatePlan(task: any): Promise<string> {
    const prompt = `
      You are a senior technical planner. 
      Analyze the following issue and create a high-level implementation plan.
      
      Repo: ${task.repo}
      Issue #${task.issueNumber}: ${task.title}
      Description: ${task.body}
      
      Format your response as a concise markdown list of steps.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    return response.choices[0].message.content || "No plan generated";
  }
}
