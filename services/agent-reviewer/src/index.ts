import dotenv from "dotenv";
import OpenAI from "openai";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, elapsedMs } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("agent-reviewer");
const eventBus = getEventBus();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function reviewCode(diff: string, plan: any): Promise<{
  status: "PASS" | "FAIL";
  feedback: string;
  issues: Array<{ severity: string; file: string; line: number; message: string }>;
}> {
  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a senior staff engineer performing a rigorous code review.

Evaluate the diff against the plan. Check for:
- Correctness: Does the code solve the problem?
- Security: Any vulnerabilities, injection risks, or data leaks?
- Architecture: Does it respect module boundaries?
- Performance: Any obvious performance issues?
- Edge cases: Are they handled?

Output format (JSON):
{
  "status": "PASS" or "FAIL",
  "feedback": "summary of review",
  "issues": [
    {"severity": "error|warning|info", "file": "path", "line": 0, "message": "description"}
  ]
}

Be strict. Only PASS if the code is genuinely production-ready.`,
      },
      {
        role: "user",
        content: `Plan:\n${JSON.stringify(plan)}\n\nDiff:\n${diff}`,
      },
    ],
  });

  const raw = response.choices[0].message.content || "{}";

  try {
    return JSON.parse(raw);
  } catch {
    const hasPass = raw.toUpperCase().includes("PASS");
    return {
      status: hasPass ? "PASS" : "FAIL",
      feedback: raw,
      issues: [],
    };
  }
}

async function start() {
  logger.info("Agent Reviewer starting...");

  await eventBus.subscribe(
    TOPICS.PIPELINE_REVIEW_REQUESTED,
    "agent-reviewer-group",
    "agent-reviewer-1",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const startTime = Date.now();

      logger.info("Reviewing code", { taskId });

      // Get latest code output
      const codeExecution = await prisma.execution.findFirst({
        where: { taskId, step: { in: ["code", "fix"] }, status: "success" },
        orderBy: { createdAt: "desc" },
      });

      const planExecution = await prisma.execution.findFirst({
        where: { taskId, step: "plan", status: "success" },
        orderBy: { createdAt: "desc" },
      });

      if (!codeExecution || !planExecution) {
        logger.error("Missing code or plan for review", { taskId });
        return;
      }

      try {
        const diff = (codeExecution.output as any)?.diff || "";
        const plan = planExecution.output;

        const result = await reviewCode(diff, plan);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "review",
            status: result.status === "PASS" ? "success" : "failed",
            output: result,
            durationMs: elapsedMs(startTime),
            costCents: 10,
          },
        });

        await eventBus.publish(TOPICS.REVIEW_COMPLETED, tenantId, {
          taskId,
          tenantId,
          status: result.status,
          feedback: result.feedback,
          issues: result.issues,
        }, event.correlationId);

        logger.info("Review completed", {
          taskId,
          status: result.status,
          issueCount: result.issues.length,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "review",
            status: "failed",
            errorMessage: errorMsg,
            durationMs: elapsedMs(startTime),
          },
        });

        logger.error("Review failed", { taskId, error: errorMsg });
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("Agent Reviewer failed to start", { error: err.message });
  process.exit(1);
});
