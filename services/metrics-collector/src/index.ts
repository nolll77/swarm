import express from "express";
import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("metrics-collector");
const eventBus = getEventBus();
const app = express();

// --- Prometheus-format metrics endpoint ---
app.get("/metrics", async (_req, res) => {
  try {
    const [
      totalTasks,
      completedTasks,
      failedTasks,
      totalPRs,
      avgDuration,
      totalCost,
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: "completed" } }),
      prisma.task.count({ where: { status: "failed" } }),
      prisma.pullRequest.count(),
      prisma.execution.aggregate({ _avg: { durationMs: true } }),
      prisma.execution.aggregate({ _sum: { costCents: true } }),
    ]);

    const lines = [
      "# HELP ai_dev_tasks_total Total number of tasks",
      "# TYPE ai_dev_tasks_total counter",
      `ai_dev_tasks_total ${totalTasks}`,
      "",
      "# HELP ai_dev_tasks_completed_total Total completed tasks",
      "# TYPE ai_dev_tasks_completed_total counter",
      `ai_dev_tasks_completed_total ${completedTasks}`,
      "",
      "# HELP ai_dev_tasks_failed_total Total failed tasks",
      "# TYPE ai_dev_tasks_failed_total counter",
      `ai_dev_tasks_failed_total ${failedTasks}`,
      "",
      "# HELP ai_dev_pull_requests_total Total pull requests created",
      "# TYPE ai_dev_pull_requests_total counter",
      `ai_dev_pull_requests_total ${totalPRs}`,
      "",
      "# HELP ai_dev_execution_duration_avg_ms Average execution duration in ms",
      "# TYPE ai_dev_execution_duration_avg_ms gauge",
      `ai_dev_execution_duration_avg_ms ${Math.round(avgDuration._avg.durationMs || 0)}`,
      "",
      "# HELP ai_dev_cost_total_cents Total cost in cents",
      "# TYPE ai_dev_cost_total_cents counter",
      `ai_dev_cost_total_cents ${totalCost._sum.costCents || 0}`,
    ];

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(lines.join("\n") + "\n");
  } catch (err) {
    logger.error("Metrics endpoint error", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).send("Error collecting metrics");
  }
});

// --- Health per-service endpoint ---
app.get("/health", async (_req, res) => {
  const services = [
    "api-gateway",
    "task-router",
    "orchestrator",
    "agent-planner",
    "agent-coder",
    "agent-reviewer",
    "pr-service",
    "ci-monitor",
    "notification",
    "metrics-collector",
  ];

  res.json({
    status: "healthy",
    services: services.map((s) => ({ name: s, status: "up" })),
    timestamp: new Date().toISOString(),
  });
});

// --- Event-driven metric recording ---
async function start() {
  logger.info("Metrics Collector starting...");

  await eventBus.subscribe(
    TOPICS.PIPELINE_COMPLETED,
    "metrics-group",
    "metrics-1",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;

      await prisma.metric.create({
        data: {
          tenantId,
          name: "pipeline_completed",
          value: 1,
          tags: { taskId },
        },
      });
    }
  );

  await eventBus.subscribe(
    TOPICS.PIPELINE_FAILED,
    "metrics-group",
    "metrics-2",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;

      await prisma.metric.create({
        data: {
          tenantId,
          name: "pipeline_failed",
          value: 1,
          tags: { taskId },
        },
      });
    }
  );

  const port = process.env.METRICS_PORT || 9090;
  app.listen(port, () => {
    logger.info("Metrics collector HTTP started", { port });
  });
}

start().catch((err) => {
  logger.fatal("Metrics Collector failed to start", { error: err.message });
  process.exit(1);
});
