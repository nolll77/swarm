import dotenv from "dotenv";
import OpenAI from "openai";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, elapsedMs } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("agent-coder");
const eventBus = getEventBus();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateCode(plan: any, previousFeedback?: string): Promise<{
  diff: string;
  filesChanged: string[];
}> {
  const systemPrompt = `You are a senior software engineer. Generate production-grade code changes.

Rules:
- Output ONLY a valid unified diff (git diff format).
- Minimal changes only. Do not refactor unrelated code.
- Handle edge cases.
- Follow existing code conventions.
- No placeholder code.`;

  let userPrompt = `Implementation plan:\n${JSON.stringify(plan.steps, null, 2)}`;

  if (previousFeedback) {
    userPrompt += `\n\nPrevious review feedback (fix these issues):\n${previousFeedback}`;
  }

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const diff = response.choices[0].message.content || "";

  // Extract file paths from diff headers
  const fileMatches = diff.match(/^(?:\+\+\+|---) [ab]\/(.+)$/gm) || [];
  const filesChanged: string[] = Array.from(new Set(
    fileMatches
      .map((m) => m.replace(/^(?:\+\+\+|---) [ab]\//, ""))
      .filter((f) => f !== "/dev/null")
  ));

  return { diff, filesChanged };
}

async function start() {
  logger.info("Agent Coder starting...");

  await eventBus.subscribe(
    TOPICS.PIPELINE_CODE_REQUESTED,
    "agent-coder-group",
    "agent-coder-1",
    async (event) => {
      const { taskId, tenantId, isFixAttempt, iteration } = event.payload as any;
      const startTime = Date.now();

      logger.info("Generating code", { taskId, isFixAttempt, iteration });

      // Get the latest plan from executions
      const planExecution = await prisma.execution.findFirst({
        where: { taskId, step: "plan", status: "success" },
        orderBy: { createdAt: "desc" },
      });

      if (!planExecution) {
        logger.error("No plan found for task", { taskId });
        return;
      }

      // If fixing, get the last review feedback
      let previousFeedback: string | undefined;
      if (isFixAttempt) {
        const lastReview = await prisma.execution.findFirst({
          where: { taskId, step: "review", status: "failed" },
          orderBy: { createdAt: "desc" },
        });
        if (lastReview) {
          previousFeedback = (lastReview.output as any)?.feedback || "";
        }
      }

      try {
        const result = await generateCode(planExecution.output as any, previousFeedback);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: isFixAttempt ? "fix" : "code",
            status: "success",
            output: result,
            durationMs: elapsedMs(startTime),
            costCents: 25,
          },
        });

        await eventBus.publish(TOPICS.CODE_GENERATED, tenantId, {
          taskId,
          tenantId,
          diff: result.diff,
          filesChanged: result.filesChanged,
        }, event.correlationId);

        logger.info("Code generated", {
          taskId,
          filesChanged: result.filesChanged.length,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: isFixAttempt ? "fix" : "code",
            status: "failed",
            errorMessage: errorMsg,
            durationMs: elapsedMs(startTime),
          },
        });

        logger.error("Code generation failed", { taskId, error: errorMsg });
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("Agent Coder failed to start", { error: err.message });
  process.exit(1);
});
