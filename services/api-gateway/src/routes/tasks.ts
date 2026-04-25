import { Router, Request, Response } from "express";
import prisma from "@ai-dev/database";
import { getEventBus } from "@ai-dev/events";
import { TOPICS } from "@ai-dev/shared";

const router = Router();
const eventBus = getEventBus();

// List tasks for tenant
router.get("/", async (req: Request, res: Response) => {
  const tenantId = res.locals.tenantId;
  const status = req.query.status as string | undefined;
  const orgId = req.query.orgId as string | undefined; // NEW: Organization filter
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const where: any = { tenantId };
  if (status) where.status = status;
  if (orgId) where.repository = { fullName: { startsWith: `${orgId}/` } };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        repository: { select: { fullName: true } },
        _count: { select: { executions: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  res.json({
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get task detail
router.get("/:id", async (req: Request, res: Response) => {
  const tenantId = res.locals.tenantId;

  const task = await prisma.task.findFirst({
    where: { id: req.params.id, tenantId },
    include: {
      repository: true,
      executions: { orderBy: { createdAt: "asc" } },
      pullRequests: true,
    },
  });

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(task);
});

// Create task manually
router.post("/", async (req: Request, res: Response) => {
  const tenantId = res.locals.tenantId;
  const { repositoryId, title, body, issueNumber } = req.body;

  if (!repositoryId || !title) {
    return res.status(400).json({ error: "repositoryId and title are required" });
  }

  const repo = await prisma.repository.findFirst({
    where: { id: repositoryId, tenantId },
  });

  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }

  const task = await prisma.task.create({
    data: {
      tenantId,
      repositoryId,
      issueNumber: issueNumber || 0,
      title,
      body: body || "",
      status: "pending",
    },
  });

  await eventBus.publish(TOPICS.TASK_CREATED, tenantId, {
    taskId: task.id,
    tenantId,
    repositoryId,
    repoFullName: repo.fullName,
    issueNumber: task.issueNumber,
    title: task.title,
    body: task.body,
  });

  res.status(201).json(task);
});

// Cancel a task
router.post("/:id/cancel", async (req: Request, res: Response) => {
  const tenantId = res.locals.tenantId;

  const task = await prisma.task.findFirst({
    where: { id: req.params.id, tenantId },
  });

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (task.status === "completed" || task.status === "cancelled") {
    return res.status(400).json({ error: "Task cannot be cancelled" });
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: "cancelled" },
  });

  res.json(updated);
});

export { router as taskRouter };
