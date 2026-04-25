import { TOPICS, RISK_CONFIG } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { EventBus } from "@ai-dev/events";
import { Logger } from "@ai-dev/logger";

type PipelineState = "plan" | "code" | "ui_code" | "review" | "fix" | "pr" | "complete" | "fail";

const STATUS_MAP: Record<PipelineState, string> = {
  plan: "planning",
  code: "coding",
  ui_code: "coding", // From a generic task perspective, it's still 'coding'
  review: "reviewing",
  fix: "fixing",
  pr: "pr_creating",
  complete: "completed",
  fail: "failed",
};

export class PipelineStateMachine {
  constructor(
    private taskId: string,
    private tenantId: string,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  async transition(to: PipelineState): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id: this.taskId } });
    if (!task) {
      this.logger.error("Task not found for transition", { taskId: this.taskId, to });
      return;
    }

    // Guard: do not process completed or cancelled tasks
    if (task.status === "completed" || task.status === "cancelled" || task.status === "failed") {
      this.logger.warn("Ignoring transition for terminal task", {
        taskId: this.taskId,
        currentStatus: task.status,
        attemptedTransition: to,
      });
      return;
    }

    this.logger.info("Pipeline transition", {
      taskId: this.taskId,
      from: task.status,
      to,
      iteration: task.currentIteration,
    });

    // --- Fix loop guard ---
    if (to === "fix") {
      if (task.currentIteration >= (task.maxIterations || RISK_CONFIG.MAX_AUTO_FIX_ITERATIONS)) {
        this.logger.warn("Max iterations reached, failing task", {
          taskId: this.taskId,
          iterations: task.currentIteration,
        });

        await prisma.task.update({
          where: { id: this.taskId },
          data: {
            status: "failed",
            errorMessage: `Failed after ${task.currentIteration} auto-fix iterations. SRE Agent deployed.`,
          },
        });

        // Elite Mode: Deploy SRE Agent on total failure
        await this.eventBus.publish(TOPICS.CI_FAILED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
          logSnippet: `Task failed on iteration ${task.currentIteration}. Max fix attempts exceeded without success.`
        });

        await this.eventBus.publish(TOPICS.PIPELINE_FAILED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
          reason: "max_iterations",
        });

        await this.eventBus.publish(TOPICS.NOTIFICATION_SEND, this.tenantId, {
          type: "pipeline_failed",
          taskId: this.taskId,
          message: `Pipeline failed for task ${task.title} after ${task.currentIteration} attempts.`,
        });

        return;
      }

      await prisma.task.update({
        where: { id: this.taskId },
        data: {
          status: STATUS_MAP[to],
          currentIteration: { increment: 1 },
        },
      });

      // Re-enter the code phase with fix context
      await this.eventBus.publish(TOPICS.PIPELINE_CODE_REQUESTED, this.tenantId, {
        taskId: this.taskId,
        tenantId: this.tenantId,
        isFixAttempt: true,
        iteration: task.currentIteration + 1,
      });

      return;
    }

    // --- Update status ---
    await prisma.task.update({
      where: { id: this.taskId },
      data: { status: STATUS_MAP[to] },
    });

    // --- Dispatch to next stage ---
    switch (to) {
      case "plan":
        await this.eventBus.publish(TOPICS.PIPELINE_PLAN_REQUESTED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
        });
        break;

      case "code":
        await this.eventBus.publish(TOPICS.PIPELINE_CODE_REQUESTED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
          isFixAttempt: false,
          iteration: 0,
        });
        break;

      case "ui_code":
        await this.eventBus.publish(TOPICS.PIPELINE_UI_CODE_REQUESTED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
          isFixAttempt: false,
          iteration: 0,
        });
        break;

      case "review":
        await this.eventBus.publish(TOPICS.PIPELINE_REVIEW_REQUESTED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
        });
        break;

      case "pr":
        await this.eventBus.publish(TOPICS.PIPELINE_PR_REQUESTED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
        });
        break;

      case "complete":
        await this.eventBus.publish(TOPICS.PIPELINE_COMPLETED, this.tenantId, {
          taskId: this.taskId,
          tenantId: this.tenantId,
        });

        await this.eventBus.publish(TOPICS.NOTIFICATION_SEND, this.tenantId, {
          type: "pipeline_completed",
          taskId: this.taskId,
          message: `Pipeline completed successfully for: ${task.title}`,
        });

        await prisma.auditLog.create({
          data: {
            tenantId: this.tenantId,
            taskId: this.taskId,
            action: "pipeline_completed",
            actor: "system",
            details: { iterations: task.currentIteration },
          },
        });
        break;
    }
  }
}
