import dotenv from "dotenv";
import OpenAI from "openai";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, elapsedMs } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("agent-planner");
const eventBus = getEventBus();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generatePlan(title: string, body: string, codebaseContext?: string): Promise<{
  rawPlan: string;
  steps: string[];
  impactedModules: string[];
}> {
  let systemContent = `You are a senior technical planner. Given a GitHub issue, produce a structured implementation plan.

Output format (JSON):
{
  "steps": ["step 1", "step 2", ...],
  "impactedModules": ["module1", "module2"],
  "summary": "brief summary"
}

Be concise. Focus on actionable steps. Identify which code modules are impacted.`;

  // Inject vector memory context if available
  if (codebaseContext) {
    systemContent += `\n\nRelevant codebase context (from vector memory):\n${codebaseContext}`;
  }

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o",
    temperature: 0,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: `Issue: ${title}\n\nDescription:\n${body}` },
    ],
  });

  const raw = response.choices[0].message.content || "{}";

  try {
    const parsed = JSON.parse(raw);
    return {
      rawPlan: raw,
      steps: parsed.steps || [],
      impactedModules: parsed.impactedModules || [],
    };
  } catch {
    return {
      rawPlan: raw,
      steps: [raw],
      impactedModules: [],
    };
  }
}

async function start() {
  logger.info("Agent Planner starting...");

  await eventBus.subscribe(
    TOPICS.PIPELINE_PLAN_REQUESTED,
    "agent-planner-group",
    "agent-planner-1",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const startTime = Date.now();

      logger.info("Generating plan", { taskId });

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { repository: true },
      });
      if (!task) {
        logger.error("Task not found", { taskId });
        return;
      }

      // --- Vector Memory Context Enrichment ---
      // Query the vector store for code snippets relevant to this task.
      // The planner uses this context to make architecture-aware decisions.
      let codebaseContext: string | undefined;
      try {
        await eventBus.publish(TOPICS.VECTOR_QUERY_REQUESTED, tenantId, {
          query: `${task.title} ${task.body}`,
          repositoryId: task.repositoryId,
          taskId,
          tenantId,
          topK: 5,
        });
        logger.info("Vector context query dispatched", { taskId });
      } catch {
        logger.warn("Vector memory unavailable, planning without context", { taskId });
      }

      try {
        const plan = await generatePlan(task.title, task.body, codebaseContext);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "plan",
            status: "success",
            output: plan,
            durationMs: elapsedMs(startTime),
            costCents: 15,
          },
        });

        await eventBus.publish(TOPICS.PLAN_GENERATED, tenantId, {
          taskId,
          tenantId,
          plan,
        }, event.correlationId);

        logger.info("Plan generated", { taskId, steps: plan.steps.length });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "plan",
            status: "failed",
            errorMessage: errorMsg,
            durationMs: elapsedMs(startTime),
          },
        });

        logger.error("Plan generation failed", { taskId, error: errorMsg });
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("Agent Planner failed to start", { error: err.message });
  process.exit(1);
});
