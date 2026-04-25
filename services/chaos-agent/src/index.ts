import dotenv from "dotenv";
import cron from "node-cron";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { pickRandomExperiment, pickExperimentByType, listExperiments } from "./experiments";
import { executeExperiment } from "./executor";
import { validateRecovery } from "./validator";

dotenv.config();

const logger = createLogger("chaos-agent");
const eventBus = getEventBus();

/**
 * Full Chaos Engineering Pipeline:
 * 1. Select an experiment (random or targeted)
 * 2. Announce the experiment (event bus notification)
 * 3. Execute the fault injection
 * 4. Wait for system response
 * 5. Validate recovery
 * 6. Log and report the results
 */
async function runChaosRound(experimentType?: string): Promise<void> {
  const experiment = experimentType
    ? pickExperimentByType(experimentType as any)
    : pickRandomExperiment();

  if (!experiment) {
    logger.error("Unknown experiment type requested", { experimentType });
    return;
  }

  logger.info("╔══════════════════════════════════════╗");
  logger.info("║     CHAOS EXPERIMENT INITIATED       ║");
  logger.info("╚══════════════════════════════════════╝");
  logger.info("Experiment details", {
    id: experiment.id,
    type: experiment.type,
    severity: experiment.severity,
    target: experiment.targetService,
    duration: `${experiment.durationMs}ms`,
  });

  // Step 1: Announce the experiment on the event bus
  await eventBus.publish(TOPICS.CHAOS_EXPERIMENT_STARTED, "system", {
    experimentId: experiment.id,
    type: experiment.type,
    severity: experiment.severity,
    targetService: experiment.targetService,
    description: experiment.description,
  });

  // Step 2: Execute the fault injection
  const executionResult = await executeExperiment(experiment);

  // Step 3: Announce completion
  await eventBus.publish(TOPICS.CHAOS_EXPERIMENT_COMPLETED, "system", {
    experimentId: experiment.id,
    type: experiment.type,
    cleanedUp: executionResult.cleanedUp,
    observedBehavior: executionResult.observedBehavior,
    durationMs: executionResult.durationMs,
  });

  // Step 4: Wait for the system to recover (grace period)
  const recoveryGracePeriodMs = 15_000;
  logger.info("Waiting for system recovery...", { gracePeriodMs: recoveryGracePeriodMs });
  await new Promise((resolve) => setTimeout(resolve, recoveryGracePeriodMs));

  // Step 5: Validate recovery
  const validation = await validateRecovery(experiment, executionResult);

  // Step 6: Log comprehensive results
  logger.info("╔══════════════════════════════════════╗");
  logger.info("║     CHAOS EXPERIMENT REPORT          ║");
  logger.info("╚══════════════════════════════════════╝");
  for (const finding of validation.findings) {
    logger.info(finding);
  }

  // Send notification for critical failures
  if (!validation.passed) {
    await eventBus.publish(TOPICS.NOTIFICATION_SEND, "system", {
      channel: "slack",
      severity: "critical",
      title: `🔴 Chaos Experiment FAILED: ${experiment.type}`,
      body: [
        `**Target:** ${experiment.targetService}`,
        `**Grade:** ${validation.grade}`,
        `**MTTR:** ${validation.mttrMs}ms`,
        `**Findings:**`,
        ...validation.findings,
        "",
        `**Rollback:** ${experiment.rollbackProcedure}`,
      ].join("\n"),
    });
  }
}

async function start() {
  logger.info("Chaos Agent starting...");
  logger.info("Available experiments:", {
    catalog: listExperiments().map((e) => `${e.type} → ${e.targetService} (${e.severity})`),
  });

  // --- Scheduled Chaos: Weekly resilience test ---
  // Runs every Sunday at 03:00 UTC (low traffic window)
  const chaosSchedule = process.env.CHAOS_CRON || "0 3 * * 0";
  cron.schedule(chaosSchedule, async () => {
    logger.info("Cron: Weekly chaos experiment triggered");
    await runChaosRound().catch((err) =>
      logger.error("Scheduled chaos round failed", { error: err.message })
    );
  });

  // --- On-demand chaos via environment variable ---
  if (process.env.CHAOS_RUN_NOW === "true") {
    const targetType = process.env.CHAOS_EXPERIMENT_TYPE; // optional: target specific experiment
    logger.info("CHAOS_RUN_NOW: Triggering immediate experiment", { targetType });
    await runChaosRound(targetType).catch((err) =>
      logger.error("Immediate chaos round failed", { error: err.message })
    );
  }

  logger.info("Chaos Agent ready", {
    schedule: chaosSchedule,
    note: "Set CHAOS_RUN_NOW=true to trigger immediately. Set CHAOS_EXPERIMENT_TYPE to target a specific experiment.",
  });
}

start().catch((err) => {
  logger.fatal("Chaos Agent failed to start", { error: err.message });
  process.exit(1);
});
