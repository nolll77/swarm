import { Router, Request, Response } from "express";
import prisma from "@ai-dev/database";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const tenantId = res.locals.tenantId;

  if (req.params.id !== tenantId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      repositories: { where: { isActive: true } },
      _count: {
        select: {
          tasks: true,
          pullRequests: true,
        },
      },
    },
  });

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  res.json({
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    autonomyLevel: tenant.autonomyLevel,
    repositories: tenant.repositories,
    stats: {
      totalTasks: tenant._count.tasks,
      totalPRs: tenant._count.pullRequests,
      budgetUsedPercent: Math.round((tenant.spentCents / tenant.monthlyBudgetCents) * 100),
    },
  });
});

router.patch("/:id/settings", async (req: Request, res: Response) => {
  const tenantId = res.locals.tenantId;

  if (req.params.id !== tenantId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const allowed = ["autonomyLevel", "maxRetriesPerTask", "allowedModules", "blockedModules"];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: updates,
  });

  res.json(tenant);
});

export { router as tenantRouter };
