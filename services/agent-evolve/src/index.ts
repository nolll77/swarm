import dotenv from "dotenv";
import cron from "node-cron";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, toJsonSafe } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { analyzeFailurePatterns } from "./failure-analyzer";
import { generateMutations, applyMutation } from "./mutation-engine";
import { promptRegistry } from "./prompt-registry";

dotenv.config();

const logger = createLogger("agent-evolve");
const eventBus = getEventBus();

// Auto-apply threshold: if a pattern has severity "critical" AND
// the mutation's risk is "low", auto-apply without human review.
// Otherwise, propose and wait for manual approval.
const AUTO_APPLY_ENABLED = process.env.EVOLVE_AUTO_APPLY === "true";

/**
 * Full Evolution Cycle:
 * 1. Mine failure patterns from execution history
 * 2. Generate targeted prompt mutations via AI
 * 3. Propose or auto-apply the mutations
 * 4. Log everything to audit trail for compliance
 */
async function runEvolutionCycle(): Promise<void> {
  logger.info("╔══════════════════════════════════════╗");
  logger.info("║   PROMPT SELF-EVOLUTION CYCLE        ║");
  logger.info("╚══════════════════════════════════════╝");

  const analysisWindow = parseInt(process.env.EVOLVE_ANALYSIS_DAYS || "30", 10);

  // Step 1: Failure Pattern Analysis
  await eventBus.publish(TOPICS.PROMPT_ANALYSIS_TRIGGERED, "system", {
    analysisWindow,
    triggeredAt: new Date().toISOString(),
  });

  const report = await analyzeFailurePatterns(analysisWindow);

  logger.info("Analysis report", {
    totalExecutions: report.totalExecutions,
    overallFailureRate: `${(report.overallFailureRate * 100).toFixed(1)}%`,
    patternsFound: report.patterns.length,
  });

  if (report.patterns.length === 0) {
    logger.info("No failure patterns detected. All agents are performing optimally.");
    return;
  }

  // Log recommendations
  for (const rec of report.recommendations) {
    logger.info(`Recommendation: ${rec}`);
  }

  // Step 2: Generate Mutations
  const mutations = await generateMutations(report);

  if (mutations.length === 0) {
    logger.info("No mutations generated. Patterns may not be addressable via prompt changes.");
    return;
  }

  // Step 3: Process each mutation
  for (const mutation of mutations) {
    logger.info("══════════════════════════════════════");
    logger.info(`Mutation proposed for: ${mutation.agentName} (${mutation.step})`);
    logger.info(`Reason: ${mutation.reason}`);
    logger.info(`Expected improvement: ${mutation.expectedImprovement}`);
    logger.info(`Risk: ${mutation.riskAssessment}`);
    logger.info(`Version: ${mutation.proposedVersion.version}`);

    // Publish the proposal for dashboards/notifications
    await eventBus.publish(TOPICS.PROMPT_MUTATION_PROPOSED, "system", {
      agentName: mutation.agentName,
      step: mutation.step,
      version: mutation.proposedVersion.version,
      reason: mutation.reason,
      expectedImprovement: mutation.expectedImprovement,
      riskAssessment: mutation.riskAssessment,
      failureRate: `${(mutation.targetedPattern.failureRate * 100).toFixed(1)}%`,
      severity: mutation.targetedPattern.severity,
    });

    // Auto-apply only for critical patterns when enabled
    if (AUTO_APPLY_ENABLED && mutation.targetedPattern.severity === "critical") {
      logger.warn("AUTO-APPLYING critical mutation", {
        agent: mutation.agentName,
        version: mutation.proposedVersion.version,
      });

      const applied = applyMutation(mutation);

      if (applied) {
        await eventBus.publish(TOPICS.PROMPT_MUTATION_APPLIED, "system", {
          agentName: mutation.agentName,
          step: mutation.step,
          version: mutation.proposedVersion.version,
          reason: mutation.reason,
          autoApplied: true,
        });
      }
    } else {
      logger.info("Mutation PROPOSED (awaiting manual approval)", {
        agent: mutation.agentName,
        version: mutation.proposedVersion.version,
      });
    }

    // Audit trail
    await prisma.auditLog.create({
      data: {
        tenantId: "system",
        action: "prompt_mutation_proposed",
        actor: "agent-evolve",
        details: toJsonSafe({
          agentName: mutation.agentName,
          step: mutation.step,
          version: mutation.proposedVersion.version,
          reason: mutation.reason,
          failureRate: mutation.targetedPattern.failureRate,
          severity: mutation.targetedPattern.severity,
          commonErrors: mutation.targetedPattern.commonErrors,
          expectedImprovement: mutation.expectedImprovement,
          riskAssessment: mutation.riskAssessment,
          autoApplied: AUTO_APPLY_ENABLED && mutation.targetedPattern.severity === "critical",
        }),
      },
    });
  }

  logger.info("══════════════════════════════════════");
  logger.info("Evolution cycle complete", {
    mutationsProposed: mutations.length,
    registry: promptRegistry.listAll(),
  });
}

async function start() {
  logger.info("Agent Prompt Self-Evolution Engine starting...");
  logger.info("Configuration", {
    autoApply: AUTO_APPLY_ENABLED,
    analysisWindow: `${process.env.EVOLVE_ANALYSIS_DAYS || 30} days`,
  });

  // Log initial prompt registry state
  logger.info("Prompt registry initialized", {
    agents: promptRegistry.listAll(),
  });

  // --- Scheduled Evolution: Weekly analysis (Monday 04:00 UTC) ---
  const schedule = process.env.EVOLVE_CRON || "0 4 * * 1";
  cron.schedule(schedule, async () => {
    logger.info("Cron: Weekly evolution cycle triggered");
    await runEvolutionCycle().catch((err) =>
      logger.error("Scheduled evolution cycle failed", { error: err.message })
    );
  });

  // --- On-demand evolution ---
  if (process.env.EVOLVE_RUN_NOW === "true") {
    logger.info("EVOLVE_RUN_NOW: Triggering immediate evolution cycle");
    await runEvolutionCycle().catch((err) =>
      logger.error("Immediate evolution cycle failed", { error: err.message })
    );
  }

  logger.info("Agent Evolve ready", {
    schedule,
    note: "Set EVOLVE_RUN_NOW=true to trigger immediately. Set EVOLVE_AUTO_APPLY=true to auto-apply critical mutations.",
  });
}

start().catch((err) => {
  logger.fatal("Agent Evolve failed to start", { error: err.message });
  process.exit(1);
});
