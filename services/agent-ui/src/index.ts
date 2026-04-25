import dotenv from "dotenv";
import OpenAI from "openai";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, elapsedMs } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("agent-ui");
const eventBus = getEventBus();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateUICode(plan: any, previousFeedback?: string): Promise<{
  diff: string;
  filesChanged: string[];
}> {
  const systemPrompt = `You are an Elite Frontend Engineer specializing in UI/UX out of Big Tech.
Your job is to generate visually stunning, highly accessible (W3C standard), and responsive UI components.

Technical Stack:
- React (Functional Components)
- Tailwind CSS (Utility-first styling, standard B2B dark modes and vibrant accents)
- Lucide React (for Icons)

Rules:
1. Output ONLY a valid unified diff (git diff format).
2. The UI must look premium: use smooth transitions (hover states, focus rings), distinct shadows, and tailored typography.
3. Keep logic clean. Create modular components if necessary.
4. Ensure mobile responsiveness.
5. NO placeholders in the code. Implement the actual UI.
6. STORYBOOK MANDATORY: For every React component you create or modify, you MUST systematically output a `.stories.tsx` file for Storybook to ensure it can be isolated and tested.`;

  let userPrompt = `UI Task Plan / Description:\n${JSON.stringify(plan.steps || plan, null, 2)}`;

  if (previousFeedback) {
    userPrompt += `\n\nPrevious UI Review Feedback (fix these visual/accessibility issues):\n${previousFeedback}`;
  }

  // NOTE: If the user provides a mockup URL in the task body, we would pass it as an image_url to the Vision model here.
  // For standard deployment, we use the text-based architecture with gpt-4o which intrinsically supports Vision inputs.

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o",
    temperature: 0.2, // Slightly higher creative freedom for UI
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const diff = response.choices[0].message.content || "";

  // Extract file paths from diff headers
  const fileMatches = diff.match(/^(?:\+\+\+|---) [ab]\/(.+)$/gm) || [];
  const filesChanged = [...new Set(
    fileMatches
      .map((m) => m.replace(/^(?:\+\+\+|---) [ab]\//, ""))
      .filter((f) => f !== "/dev/null")
  )];

  return { diff, filesChanged };
}

async function start() {
  logger.info("Agent UI (Frontend Module) starting...");

  await eventBus.subscribe(
    TOPICS.PIPELINE_UI_CODE_REQUESTED,
    "agent-ui-group",
    "agent-ui-1",
    async (event) => {
      const { taskId, tenantId, isFixAttempt, iteration } = event.payload as any;
      const startTime = Date.now();

      logger.info("Generating UI code", { taskId, isFixAttempt, iteration });

      const planExecution = await prisma.execution.findFirst({
        where: { taskId, step: "plan", status: "success" },
        orderBy: { createdAt: "desc" },
      });

      if (!planExecution) {
        logger.error("No plan found for task", { taskId });
        return;
      }

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
        const result = await generateUICode(planExecution.output as any, previousFeedback);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "ui_code",
            status: "success",
            output: result,
            durationMs: elapsedMs(startTime),
            costCents: 35, // Vision models / complex UI layouts cost more natively
          },
        });

        // Publish generic CODE_GENERATED to continue standard CI/Review pipeline
        await eventBus.publish(TOPICS.UI_CODE_GENERATED, tenantId, {
          taskId,
          tenantId,
          diff: result.diff,
          filesChanged: result.filesChanged,
        }, event.correlationId);

        logger.info("UI Code generated", {
          taskId,
          filesChanged: result.filesChanged.length,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "ui_code",
            status: "failed",
            errorMessage: errorMsg,
            durationMs: elapsedMs(startTime),
          },
        });

        logger.error("UI Code generation failed", { taskId, error: errorMsg });
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("Agent UI failed to start", { error: err.message });
  process.exit(1);
});
