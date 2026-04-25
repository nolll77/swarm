import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("ci-monitor");
const eventBus = getEventBus();

async function start() {
  logger.info("CI Monitor starting...");

  await eventBus.subscribe(
    TOPICS.CI_CHECK_RECEIVED,
    "ci-monitor-group",
    "ci-monitor-1",
    async (event) => {
      const { tenantId, repo, conclusion, headBranch } = event.payload as any;

      logger.info("CI check received", { repo, conclusion, headBranch });

      // Only process AI-created branches
      if (!headBranch || !headBranch.startsWith("ai/")) {
        return;
      }

      // Find the associated PR
      const pr = await prisma.pullRequest.findFirst({
        where: {
          tenantId,
          branchName: headBranch,
          status: "open",
        },
        include: { task: true },
      });

      if (!pr) {
        logger.debug("No matching PR found for branch", { headBranch });
        return;
      }

      await prisma.execution.create({
        data: {
          taskId: pr.taskId,
          tenantId,
          step: "ci_check",
          status: conclusion === "success" ? "success" : "failed",
          output: { conclusion, headBranch },
          durationMs: 0,
          costCents: 0,
        },
      });

      if (conclusion === "success") {
        logger.info("CI passed", { taskId: pr.taskId, prNumber: pr.githubPrNumber });

        await eventBus.publish(TOPICS.CI_PASSED, tenantId, {
          taskId: pr.taskId,
          tenantId,
          prNumber: pr.githubPrNumber,
        }, event.correlationId);
      } else {
        logger.warn("CI failed", {
          taskId: pr.taskId,
          prNumber: pr.githubPrNumber,
          conclusion,
        });

        await eventBus.publish(TOPICS.CI_FAILED, tenantId, {
          taskId: pr.taskId,
          tenantId,
          prNumber: pr.githubPrNumber,
          conclusion,
        }, event.correlationId);
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("CI Monitor failed to start", { error: err.message });
  process.exit(1);
});
