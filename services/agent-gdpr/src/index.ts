import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";

dotenv.config();

const logger = createLogger("agent-gdpr");
const eventBus = getEventBus();

async function analyzeCompliance(diff: string): Promise<{
  safe: boolean;
  issues: string[];
  score: number;
}> {
  const issues: string[] = [];
  
  // Simulated Regex/Heuristic Checks (In prod, this would be an LLM call)
  const piiPatterns = [
    { name: "Email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { name: "Phone", regex: /\+?[0-9]{10,15}/g },
    { name: "Credit Card", regex: /[0-9]{13,16}/g }
  ];

  for (const pattern of piiPatterns) {
    if (pattern.regex.test(diff)) {
      issues.push(`PII Detected: Potential ${pattern.name} leak in plain text.`);
    }
  }

  if (diff.includes("Prisma.defineModel") && !diff.includes("tenantId")) {
    issues.push("Missing tenantId: Data isolation breach in database schema.");
  }

  const safe = issues.length === 0;
  const score = safe ? 100 : Math.max(0, 100 - issues.length * 25);

  return { safe, issues, score };
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
