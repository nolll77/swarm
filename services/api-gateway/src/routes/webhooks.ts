import { Router, Request, Response } from "express";
import crypto from "crypto";
import { getEventBus } from "@ai-dev/events";
import prisma from "@ai-dev/database";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, generateId } from "@ai-dev/shared";

const router = Router();
const logger = createLogger("webhooks");
const eventBus = getEventBus();

function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

router.post("/github", async (req: Request, res: Response) => {
  const event = req.headers["x-github-event"] as string;
  const signature = req.headers["x-hub-signature-256"] as string;
  const deliveryId = req.headers["x-github-delivery"] as string;

  logger.info("Webhook received", { event, deliveryId });

  // Verify signature if secret is configured
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (webhookSecret && signature) {
    const isValid = verifyGitHubSignature(JSON.stringify(req.body), signature, webhookSecret);
    if (!isValid) {
      logger.warn("Invalid webhook signature", { deliveryId });
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const payload = req.body;

  // --- Handle Issue Events ---
  if (event === "issues" && payload.action === "opened") {
    const installationId = String(payload.installation?.id || "");

    const tenant = await prisma.tenant.findUnique({
      where: { githubInstallationId: installationId },
    });

    if (!tenant) {
      logger.warn("No tenant for installation", { installationId });
      return res.status(404).json({ error: "Tenant not found" });
    }

    let repo = await prisma.repository.findFirst({
      where: { tenantId: tenant.id, fullName: payload.repository.full_name },
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          tenantId: tenant.id,
          fullName: payload.repository.full_name,
          defaultBranch: payload.repository.default_branch || "main",
          language: payload.repository.language || "",
        },
      });
    }

    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        repositoryId: repo.id,
        issueNumber: payload.issue.number,
        title: payload.issue.title,
        body: payload.issue.body || "",
        status: "pending",
        maxIterations: tenant.maxRetriesPerTask,
      },
    });

    await eventBus.publish(TOPICS.TASK_CREATED, tenant.id, {
      taskId: task.id,
      tenantId: tenant.id,
      repositoryId: repo.id,
      repoFullName: repo.fullName,
      issueNumber: payload.issue.number,
      title: payload.issue.title,
      body: payload.issue.body || "",
    });

    logger.info("Task created from issue", {
      taskId: task.id,
      tenantId: tenant.id,
      issueNumber: payload.issue.number,
    });

    return res.status(202).json({ taskId: task.id });
  }

  // --- Handle Check Suite Events (CI results) ---
  if (event === "check_suite" && payload.action === "completed") {
    const installationId = String(payload.installation?.id || "");

    const tenant = await prisma.tenant.findUnique({
      where: { githubInstallationId: installationId },
    });

    if (tenant) {
      await eventBus.publish(TOPICS.CI_CHECK_RECEIVED, tenant.id, {
        tenantId: tenant.id,
        repo: payload.repository.full_name,
        conclusion: payload.check_suite.conclusion,
        headSha: payload.check_suite.head_sha,
        headBranch: payload.check_suite.head_branch,
      });
    }
  }

  res.status(200).json({ received: true });
});

export { router as webhookRouter };
