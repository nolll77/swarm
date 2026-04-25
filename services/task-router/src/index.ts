import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, RISK_CONFIG } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("task-router");
const eventBus = getEventBus();

// --- Risk classification ---
function classifyRisk(title: string, body: string, blockedModules: string[]): string {
  const combined = (title + " " + body).toLowerCase();

  for (const mod of RISK_CONFIG.HIGH_RISK_MODULES) {
    if (combined.includes(mod)) return "high";
  }
  for (const mod of blockedModules) {
    if (combined.includes(mod)) return "critical";
  }
  for (const mod of RISK_CONFIG.MEDIUM_RISK_MODULES) {
    if (combined.includes(mod)) return "medium";
  }
  return "low";
}

// --- Task type detection ---
function classifyType(title: string, body: string): string {
  const combined = (title + " " + body).toLowerCase();

  const unsafeKeywords = ["delete all", "drop database", "rm -rf", "destroy"];
  const uiKeywords = ["figma", "mockup", "design", "ui", "frontend", "tailwind", "component"];
  const bugKeywords = ["bug", "fix", "error", "crash", "broken", "issue", "regression"];
  const refactorKeywords = ["refactor", "cleanup", "technical debt", "restructure"];

  for (const kw of unsafeKeywords) {
    if (combined.includes(kw)) return "unsafe";
  }
  for (const kw of uiKeywords) {
    if (combined.includes(kw)) return "ui_design";
  }
  for (const kw of bugKeywords) {
    if (combined.includes(kw)) return "bug";
  }
  for (const kw of refactorKeywords) {
    if (combined.includes(kw)) return "refactor";
  }
  return "feature";
}

// --- Main consumer ---
async function start() {
  logger.info("Task Router starting...");

  await eventBus.subscribe(
    TOPICS.TASK_CREATED,
    "task-router-group",
    "task-router-1",
    async (event) => {
      const { taskId, tenantId, title, body } = event.payload as any;

      logger.info("Routing task", { taskId, tenantId });

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        logger.error("Tenant not found", { tenantId });
        return;
      }

      const taskType = classifyType(title, body);
      const riskLevel = classifyRisk(title, body, tenant.blockedModules);

      // --- Billing/Quota Gate ---
      if (tenant.billingStatus !== "active" || tenant.spentCents >= tenant.monthlyBudgetCents) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            type: taskType,
            riskLevel,
            status: "failed",
            errorMessage: "Task rejected: 402 Payment Required. Budget exceeded or status inactive.",
          },
        });

        await eventBus.publish(TOPICS.NOTIFICATION_SEND, tenantId, {
          channel: "all",
          message: `Task #${taskId} rejected due to billing limits (${tenant.spentCents}/${tenant.monthlyBudgetCents} used).`,
        });

        logger.warn("Task rejected due to billing limits", { taskId, spent: tenant.spentCents });
        return;
      }

      // Reject unsafe tasks immediately
      if (taskType === "unsafe") {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            type: taskType,
            riskLevel,
            status: "failed",
            errorMessage: "Task classified as unsafe and was rejected.",
          },
        });

        logger.warn("Unsafe task rejected", { taskId });
        return;
      }

      // Reject critical risk if autonomy is limited
      if (riskLevel === "critical" && tenant.autonomyLevel !== "auto-merge") {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            type: taskType,
            riskLevel,
            status: "failed",
            errorMessage: "Task touches blocked modules. Manual intervention required.",
          },
        });

        await eventBus.publish(TOPICS.NOTIFICATION_SEND, tenantId, {
          channel: "all",
          message: `Task #${taskId} was rejected: touches blocked modules.`,
        });

        logger.warn("Critical risk task rejected", { taskId, riskLevel });
        return;
      }

      // Route the task
      await prisma.task.update({
        where: { id: taskId },
        data: {
          type: taskType,
          riskLevel,
          status: "triaging",
        },
      });

      await prisma.execution.create({
        data: {
          taskId,
          tenantId,
          step: "triage",
          status: "success",
          output: { taskType, riskLevel },
          durationMs: 0,
          costCents: 0,
        },
      });

      await eventBus.publish(TOPICS.TASK_ROUTED, tenantId, {
        ...event.payload,
        taskType,
        riskLevel,
      }, event.correlationId);

      logger.info("Task routed", { taskId, taskType, riskLevel });
    }
  );
}

start().catch((err) => {
  logger.fatal("Task Router failed to start", { error: err.message });
  process.exit(1);
});
