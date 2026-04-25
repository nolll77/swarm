import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { PipelineStateMachine } from "./state-machine";

dotenv.config();

const logger = createLogger("orchestrator");
const eventBus = getEventBus();

async function start() {
  logger.info("Orchestrator starting...");

  // --- Listen for routed tasks (start pipeline) ---
  await eventBus.subscribe(
    TOPICS.TASK_ROUTED,
    "orchestrator-group",
    "orchestrator-1",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const machine = new PipelineStateMachine(taskId, tenantId, eventBus, logger);
      await machine.transition("plan");
    }
  );

  // --- Listen for plan results ---
  await eventBus.subscribe(
    TOPICS.PLAN_GENERATED,
    "orchestrator-group",
    "orchestrator-2",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const machine = new PipelineStateMachine(taskId, tenantId, eventBus, logger);
      
      const task = await prisma.task.findUnique({ where: { id: taskId }});
      if (task?.type === "ui_design") {
        await machine.transition("ui_code");
      } else {
        await machine.transition("code");
      }
    }
  );

  // --- Listen for UI code results ---
  await eventBus.subscribe(
    TOPICS.UI_CODE_GENERATED,
    "orchestrator-group",
    "orchestrator-ui-1",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const machine = new PipelineStateMachine(taskId, tenantId, eventBus, logger);
      await machine.transition("review");
    }
  );

  // --- Listen for code results ---
  await eventBus.subscribe(
    TOPICS.CODE_GENERATED,
    "orchestrator-group",
    "orchestrator-3",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const machine = new PipelineStateMachine(taskId, tenantId, eventBus, logger);
      await machine.transition("review");
    }
  );

  // --- Listen for review results ---
  await eventBus.subscribe(
    TOPICS.REVIEW_COMPLETED,
    "orchestrator-group",
    "orchestrator-4",
    async (event) => {
      const { taskId, tenantId, status } = event.payload as any;
      const machine = new PipelineStateMachine(taskId, tenantId, eventBus, logger);

      if (status === "PASS") {
        await machine.transition("pr");
      } else {
        await machine.transition("fix");
      }
    }
  );

  // --- Listen for CI results ---
  await eventBus.subscribe(
    TOPICS.CI_PASSED,
    "orchestrator-group",
    "orchestrator-5",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const machine = new PipelineStateMachine(taskId, tenantId, eventBus, logger);
      await machine.transition("complete");
    }
  );

  await eventBus.subscribe(
    TOPICS.CI_FAILED,
    "orchestrator-group",
    "orchestrator-6",
    async (event) => {
      const { taskId, tenantId } = event.payload as any;
      const machine = new PipelineStateMachine(taskId, tenantId, eventBus, logger);
      await machine.transition("fix");
    }
  );
}

start().catch((err) => {
  logger.fatal("Orchestrator failed to start", { error: err.message });
  process.exit(1);
});
