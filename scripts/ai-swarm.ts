import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runSwarmStep(command: 'PLAN' | 'IMPLEMENT' | 'TEST' | 'REVIEW', task: string, contextModule?: string) {
  const aiDir = path.join(process.cwd(), '.ai');
  
  // 1. Load Founders/Core Rules
  const agentsMd = fs.readFileSync(path.join(aiDir, 'AGENTS.md'), 'utf-8');
  const codeRulesMd = fs.readFileSync(path.join(aiDir, 'rules/code.md'), 'utf-8');
  const projectContextMd = fs.readFileSync(path.join(aiDir, 'context/project.md'), 'utf-8');
  
  // 2. Load Command Template
  const commandsMd = fs.readFileSync(path.join(aiDir, 'commands/workflow.md'), 'utf-8');
  const commandRegex = new RegExp(`## 📋 ${command}\\n\\`\\`\\`md\\n([\\s\\S]*?)\\n\\`\\`\\``);
  const commandPrompt = commandsMd.match(commandRegex)?.[1] || "";

  // 3. Optional Module Context
  let moduleContext = "";
  if (contextModule) {
    const modulePath = path.join(aiDir, 'context/modules', `${contextModule}.md`);
    if (fs.existsSync(modulePath)) {
      moduleContext = fs.readFileSync(modulePath, 'utf-8');
    }
  }

  const systemPrompt = `
${agentsMd}
${codeRulesMd}
${projectContextMd}
${moduleContext}
`;

  console.log(`\n[Amaswarn CLI] Executing STEP: ${command}...`);

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${commandPrompt}\n\nTASK:\n${task}` }
    ]
  });

  const result = response.choices[0].message.content;
  console.log(`\n--- RESULT ---\n${result}\n--- END ---\n`);
  return result;
}

// Logic to run the full loop if requested
const [,, cmd, task, module] = process.argv;
if (cmd && task) {
  runSwarmStep(cmd as any, task, module).catch(console.error);
}
