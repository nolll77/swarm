import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, sanitizeBranchName, elapsedMs } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

dotenv.config();

const logger = createLogger("pr-service");
const eventBus = getEventBus();

function getOctokit(): Octokit {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

async function start() {
  logger.info("PR Service starting...");

  await eventBus.subscribe(
    TOPICS.PIPELINE_PR_REQUESTED,
    "pr-service-group",
    "pr-service-1",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const startTime = Date.now();

      logger.info("Creating PR", { taskId });

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { repository: true },
      });

      if (!task || !task.repository) {
        logger.error("Task or repository not found", { taskId });
        return;
      }

      const codeExecution = await prisma.execution.findFirst({
        where: { taskId, step: { in: ["code", "fix"] }, status: "success" },
        orderBy: { createdAt: "desc" },
      });

      if (!codeExecution) {
        logger.error("No code found for PR", { taskId });
        return;
      }

      const [owner, repoName] = task.repository.fullName.split("/");
      const branchName = `ai/${sanitizeBranchName(`fix-${task.issueNumber}-${task.title}`)}`;
      const diff = (codeExecution.output as any)?.diff || "";

      try {
        const octokit = getOctokit();

        // Get default branch SHA
        const { data: ref } = await octokit.git.getRef({
          owner,
          repo: repoName,
          ref: `heads/${task.repository.defaultBranch}`,
        });

        // Create branch
        try {
          await octokit.git.createRef({
            owner,
            repo: repoName,
            ref: `refs/heads/${branchName}`,
            sha: ref.object.sha,
          });
        } catch (err: any) {
          if (err.status !== 422) throw err;
          // Branch already exists, update it
          await octokit.git.updateRef({
            owner,
            repo: repoName,
            ref: `heads/${branchName}`,
            sha: ref.object.sha,
            force: true,
          });
        }

        // Create PR body
        const prBody = [
          `## AI-Generated PR for #${task.issueNumber}`,
          "",
          `**Task:** ${task.title}`,
          `**Type:** ${task.type}`,
          `**Risk Level:** ${task.riskLevel}`,
          `**Iterations:** ${task.currentIteration + 1}`,
          "",
          "### Generated Diff",
          "```diff",
          diff.slice(0, 5000),
          "```",
          "",
          "---",
          "_This PR was created by the AI Dev Platform._",
        ].join("\n");

        // Create PR
        const { data: pr } = await octokit.pulls.create({
          owner,
          repo: repoName,
          title: `[AI] #${task.issueNumber}: ${task.title}`,
          head: branchName,
          base: task.repository.defaultBranch,
          body: prBody,
        });

        // Store PR in database
        await prisma.pullRequest.create({
          data: {
            taskId,
            tenantId,
            repositoryId: task.repositoryId,
            githubPrNumber: pr.number,
            branchName,
            title: pr.title,
            status: "open",
            url: pr.html_url,
            iterations: task.currentIteration + 1,
          },
        });

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "pr_create",
            status: "success",
            output: { prNumber: pr.number, url: pr.html_url },
            durationMs: elapsedMs(startTime),
            costCents: 0,
          },
        });

        await prisma.task.update({
          where: { id: taskId },
          data: { status: "ci_monitoring" },
        });

        await eventBus.publish(TOPICS.PR_CREATED, tenantId, {
          taskId,
          tenantId,
          prNumber: pr.number,
          url: pr.html_url,
          branchName,
        }, event.correlationId);

        logger.info("PR created", { taskId, prNumber: pr.number, url: pr.html_url });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        await prisma.execution.create({
          data: {
            taskId,
            tenantId,
            step: "pr_create",
            status: "failed",
            errorMessage: errorMsg,
            durationMs: elapsedMs(startTime),
          },
        });

        await prisma.task.update({
          where: { id: taskId },
          data: { status: "failed", errorMessage: `PR creation failed: ${errorMsg}` },
        });

        logger.error("PR creation failed", { taskId, error: errorMsg });
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("PR Service failed to start", { error: err.message });
  process.exit(1);
});
