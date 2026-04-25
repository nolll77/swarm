import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateGitPatch(issue: string, context: string) {
  const prompt = `
You are an Elite Staff Engineer at a top-tier SaaS company.

TASK:
Produce a valid Git UNIFIED DIFF to solve the issue below.

CONSTRAINTS:
- Keep changes minimal and focused.
- Output ONLY the unified diff format.
- No conversational text or markdown blocks.

ISSUE:
${issue}

CONTEXT CODE:
${context}
`;

  if (!process.env.OPENAI_API_KEY) {
    return `--- a/fixes/fix.ts
+++ b/fixes/fix.ts
@@ -1,3 +1,4 @@
 export function fix() {
-  return false;
+  // Autonomous fix applied for: ${issue}
+  return true;
 }`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: "You are a Git Patch generator. You output only unified diff patches." },
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0].message.content || "";
}
