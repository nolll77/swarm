import { Router, Request, Response } from "express";
import prisma from "@ai-dev/database";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const tenantId = res.locals.tenantId;
  const range = req.query.range === "7d" ? 7 : req.query.range === "30d" ? 30 : 1;
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);

  const [
    totalTasks,
    completedTasks,
    failedTasks,
    totalPRs,
    mergedPRs,
    executions,
    tenant,
  ] = await Promise.all([
    prisma.task.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.task.count({ where: { tenantId, status: "completed", createdAt: { gte: since } } }),
    prisma.task.count({ where: { tenantId, status: "failed", createdAt: { gte: since } } }),
    prisma.pullRequest.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.pullRequest.count({ where: { tenantId, status: "merged", createdAt: { gte: since } } }),
    prisma.execution.aggregate({
      where: { tenantId, createdAt: { gte: since } },
      _sum: { durationMs: true, costCents: true },
      _avg: { durationMs: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ]);

  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const prMergeRate = totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 100) : 0;

  res.json({
    range: `${range}d`,
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      failed: failedTasks,
      successRate,
    },
    pullRequests: {
      total: totalPRs,
      merged: mergedPRs,
      mergeRate: prMergeRate,
    },
    performance: {
      totalDurationMs: executions._sum.durationMs || 0,
      avgDurationMs: Math.round(executions._avg.durationMs || 0),
      totalCostCents: executions._sum.costCents || 0,
    },
    budget: {
      monthlyLimitCents: tenant?.monthlyBudgetCents || 0,
      spentCents: tenant?.spentCents || 0,
      remainingPercent: tenant
        ? Math.max(0, Math.round(((tenant.monthlyBudgetCents - tenant.spentCents) / tenant.monthlyBudgetCents) * 100))
        : 0,
    },
  });
});

export { router as metricsRouter };
