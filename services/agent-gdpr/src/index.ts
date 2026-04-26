import dotenv from "dotenv";
import OpenAI from "openai";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";

dotenv.config();

const logger = createLogger("agent-gdpr");
const eventBus = getEventBus();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function analyzeCompliance(diff: string): Promise<{
  safe: boolean;
  issues: { severity: string; description: string; remediation: string }[];
  score: number;
}> {
  const systemPrompt = `You are a strict European Data Sovereignty & GDPR Compliance Auditor for a B2B Enterprise SaaS.
Your job is to analyze the provided git diff and detect any compliance or security vulnerabilities.
Critically evaluate the code against these 4 pillars:
1. PII Exposure: Ensure no Emails, Phone numbers, SSNs, or Credit Cards can be logged or stored in plain text.
2. Tenant Isolation (Privacy by Design): Any Prisma schema or database query MUST include 'tenantId' segregation.
3. Data Sovereignty: Detect any HTTP/API calls sending data to unauthorized 3rd-party services outside the EU.
4. Secret Leakage: Prevent hardcoded API keys, tokens, or passwords.

Respond ONLY with a valid JSON object matching this schema:
{
  "safe": boolean, // False if ANY issue of severity 'high' or 'critical' is found
  "score": number, // 0-100 (100 = perfectly safe, -20 per high issue, -10 per medium)
  "issues": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "description": "Clear explanation of the sovereignty or privacy breach",
      "remediation": "How the agent should fix the code (e.g., 'Use Hash() for password', 'Add tenantId to where clause')"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this diff:\n\n${diff}` },
      ],
    });

    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    return {
      safe: typeof result.safe === "boolean" ? result.safe : true,
      issues: Array.isArray(result.issues) ? result.issues : [],
      score: typeof result.score === "number" ? result.score : 100,
    };
  } catch (err) {
    logger.error("Failed to analyze compliance using LLM", { error: err instanceof Error ? err.message : String(err) });
    return { 
      safe: false, 
      issues: [{ severity: "critical", description: "Compliance Engine Failure", remediation: "Check OpenAI API keys and network." }], 
      score: 0 
    };
  }
}

async function start() {
  logger.info("GDPR Compliance Agent starting...");

  await eventBus.subscribe(
    TOPICS.REVIEW_REQUESTED,
    "gdpr-compliance-group",
    "gdpr-agent-1",
    async (event) => {
      const { taskId, tenantId, diff } = event.payload as any;

      logger.info("Analyzing compliance for task", { taskId, tenantId });

      const analysis = await analyzeCompliance(diff);

      if (!analysis.safe) {
        logger.warn("Compliance issues detected", { taskId, issues: analysis.issues });
      }

      await eventBus.publish(TOPICS.COMPLIANCE_REVIEW_COMPLETED, tenantId, {
        taskId,
        ...analysis
      }, event.correlationId);
    }
  );
}

start().catch((err) => {
  logger.fatal("GDPR Agent failed to start", { error: err.message });
  process.exit(1);
});
