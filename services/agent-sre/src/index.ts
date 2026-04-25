import dotenv from "dotenv";
import OpenAI from "openai";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("agent-sre");
const eventBus = getEventBus();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * The SRE Agent's core Root Cause Analysis generation
 */
async function generateRCA(errorLogs: string, contextString: string): Promise<string> {
  const systemPrompt = `You are an elite Site Reliability Engineer (SRE).
Your job is to analyze system failures, CI crashes, or deployment rollbacks.
Output a highly technical Root Cause Analysis (RCA) in Markdown with:
1. Incident Timeline
2. Root Cause
3. Recommended Fix Strategy

Only give the Markdown. Do not include introductory text.`;

  const userPrompt = `System Context: ${contextString}\n\nError Traces / Logs:\n${errorLogs}`;

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o",
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0].message.content || "Could not generate RCA.";
}

async function start() {
  logger.info("Agent SRE starting (Autonomous Operations Mode)...");

  // The SRE agent is an active subscriber to CI failures or runtime anomalies.
  await eventBus.subscribe(
    TOPICS.CI_FAILED,
    "sre-group",
    "sre-worker-1",
    async (event) => {
      const { taskId, tenantId, logSnippet } = event.payload as any;
      logger.info("SRE Intervening: CI Failed detected", { taskId });

      // Gather context
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { repository: true }
      });

      if (!task) return;

      const contextString = `Repository: ${task.repository.fullName}\nTask: ${task.title}\nDescription: ${task.body}`;
      
      const rcaMarkdown = await generateRCA(logSnippet || "No logs provided. Exit code 1.", contextString);

      // Log RCA to executions audit and notify system
      await prisma.execution.create({
        data: {
          taskId,
          tenantId,
          step: "ci_check",
          status: "failed", // It represents an analysis of a failure
          output: { rca: rcaMarkdown },
          costCents: 15, // Cost for intense prompt
        }
      });

      // Emitting the SRE incident for downstream auto-healing
      await eventBus.publish(TOPICS.SRE_RCA_GENERATED, tenantId, {
        taskId,
        tenantId,
        rca: rcaMarkdown
      }, event.correlationId);

      // Alerting humans with the distilled root cause
      await eventBus.publish(TOPICS.NOTIFICATION_SEND, tenantId, {
        channel: "all",
        message: `🚨 *SRE Alert: CI Pipeline Failed for Task #${taskId}*\n\n*Root Cause Snapshot:*\n${rcaMarkdown.substring(0, 300)}...`
      });

      logger.info("RCA Generated & SRE Notification dispatched", { taskId });
    }
  );
}

start().catch((err) => {
  logger.fatal("Agent SRE failed to start", { error: err.message });
  process.exit(1);
});
