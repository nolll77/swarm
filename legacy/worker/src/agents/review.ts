import OpenAI from "openai";

export class ReviewAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async reviewCode(patch: string, plan: string): Promise<{
    status: "PASS" | "FAIL";
    feedback: string;
  }> {
    const prompt = `
      You are a senior staff engineer. Review the following code change against the plan.
      
      Plan:
      ${plan}
      
      Diff:
      ${patch}
      
      Identify any bugs, security risks, or architecture violations.
      If the code is safe and correct, start your response with "STATUS: PASS".
      If there are issues, start with "STATUS: FAIL" and list precisely what needs to be fixed.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const content = response.choices[0].message.content || "";
    const status = content.includes("STATUS: PASS") ? "PASS" : "FAIL";

    return {
      status,
      feedback: content,
    };
  }
}
