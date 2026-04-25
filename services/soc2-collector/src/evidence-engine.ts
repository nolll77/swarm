import prisma from "@ai-dev/database";
import { createLogger } from "@ai-dev/logger";

const logger = createLogger("soc2-collector:evidence-engine");

export interface EvidencePayload {
  period: string;
  tenantId: string | null;
  tenantName: string;
  auditLogs: any[];
  tasks: any[];
  executions: any[];
  pullRequests: any[];
}

/**
 * Queries all SOC2-relevant structured evidence for a given period.
 * Period format: "YYYY-MM" (e.g. "2024-04")
 */
export async function collectEvidence(
  period: string,
  tenantId?: string
): Promise<EvidencePayload> {
  const [year, month] = period.split("-").map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1); // exclusive upper bound

  logger.info("Collecting evidence", { period, tenantId, from, to });

  const tenantFilter = tenantId ? { tenantId } : {};

  // Fetch all audit logs for the period (immutable, SOC2 source of truth)
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      ...tenantFilter,
      timestamp: { gte: from, lt: to },
    },
    orderBy: { timestamp: "asc" },
    take: 10000, // Safety cap per report
  });

  // Fetch all completed tasks (proofs of human-in-the-loop or autonomous action)
  const tasks = await prisma.task.findMany({
    where: {
      ...tenantFilter,
      createdAt: { gte: from, lt: to },
    },
    include: { repository: true },
    orderBy: { createdAt: "asc" },
  });

  // Fetch all execution steps (detailed agent traces)
  const executions = await prisma.execution.findMany({
    where: {
      ...tenantFilter,
      createdAt: { gte: from, lt: to },
    },
    orderBy: { createdAt: "asc" },
  });

  // Fetch all PRs created in the period
  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      ...tenantFilter,
      createdAt: { gte: from, lt: to },
    },
    orderBy: { createdAt: "asc" },
  });

  let tenantName = "All Tenants (Platform Report)";
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    tenantName = tenant?.name ?? tenantId;
  }

  logger.info("Evidence collected", {
    period,
    auditLogCount: auditLogs.length,
    taskCount: tasks.length,
    executionCount: executions.length,
  });

  return {
    period,
    tenantId: tenantId ?? null,
    tenantName,
    auditLogs,
    tasks,
    executions,
    pullRequests,
  };
}
