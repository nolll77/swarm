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
  issues: string[];
  score: number;
}> {
  const systemPrompt = `You are a strict GDPR & Security Compliance Auditor for a SaaS platform.
Your job is to analyze the provided git diff and detect any compliance or security issues.
Specifically, look for:
1. PII exposure (Emails, Phone numbers, SSNs, Credit Cards) in plain text or logs.
2. Missing tenantId segregation in database models (Prisma schema changes).

Respond ONLY with a valid JSON object matching this schema:
{
  "safe": boolean,
  "issues": string[], // Descriptions of issues. Empty if safe.
  "score": number // 0-100, 100 is perfectly safe.
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
    return { safe: false, issues: ["Failed to analyze compliance"], score: 0 };
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
