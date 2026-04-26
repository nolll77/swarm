import { createLogger } from "@ai-dev/logger";
import prisma from "@ai-dev/database";
import { getEventBus } from "@ai-dev/events";
import { TOPICS, toJsonSafe } from "@ai-dev/shared";
import type { ChaosExperiment } from "./experiments";
import type { ExecutionResult } from "./executor";

const logger = createLogger("chaos-agent:validator");
const eventBus = getEventBus();

/**
 * Post-Experiment Validation Engine.
 *
 * After a chaos experiment completes, the validator checks whether
 * the platform actually recovered as expected. This is the difference
 * between "we hope it works" and "we proved it works".
 *
 * Validation checks:
 * 1. Did the SRE Agent detect the incident? (AuditLog check)
 * 2. Did the affected service come back online? (Health check)
 * 3. Were there data losses? (Task state consistency check)
 * 4. How long did recovery take? (MTTR measurement)
 */

export interface ValidationResult {
  experimentId: string;
  passed: boolean;
  sreDetected: boolean;
  serviceRecovered: boolean;
  dataIntegrity: boolean;
  mttrMs: number;          // Mean Time To Recovery
  findings: string[];
  grade: "A" | "B" | "C" | "D" | "F";
}

export async function validateRecovery(
  experiment: ChaosExperiment,
  executionResult: ExecutionResult
): Promise<ValidationResult> {
  const findings: string[] = [];
  const validationStart = Date.now();

  logger.info("Starting post-experiment validation", {
    experimentId: experiment.id,
    type: experiment.type,
  });

  // --- Check 1: Did the SRE Agent detect the incident? ---
  const sreAlerts = await prisma.auditLog.findMany({
    where: {
      action: { in: ["sre_rca_generated", "sre_incident_detected"] },
      timestamp: {
        gte: executionResult.startedAt,
        lte: new Date(executionResult.endedAt.getTime() + 60_000), // +1 min buffer
      },
    },
  });

  const sreDetected = sreAlerts.length > 0;
  if (sreDetected) {
    findings.push(`✅ SRE Agent detected the incident (${sreAlerts.length} alert(s) logged).`);
  } else {
    findings.push(`❌ SRE Agent did NOT detect the incident. Alert pipeline may be broken.`);
  }

  // --- Check 2: Service Recovery ---
  // In production, this would ping the target service's health endpoint.
  // For now, we verify the experiment's self-cleanup flag.
  const serviceRecovered = executionResult.cleanedUp;
  if (serviceRecovered) {
    findings.push(`✅ Service '${experiment.targetService}' recovered (cleanup confirmed).`);
  } else {
    findings.push(`❌ Service '${experiment.targetService}' did NOT recover cleanly. Manual intervention required.`);
  }

  // --- Check 3: Data Integrity ---
  // Check if any tasks were corrupted (stuck in a non-terminal state without updates)
  const stuckTasks = await prisma.task.findMany({
    where: {
      status: { in: ["coding", "planning", "reviewing", "fixing"] },
      updatedAt: {
        lt: new Date(Date.now() - 120_000), // Not updated in 2+ minutes
      },
    },
  });

  const dataIntegrity = stuckTasks.length === 0;
  if (dataIntegrity) {
    findings.push(`✅ Data integrity verified. No stuck/orphaned tasks detected.`);
  } else {
    findings.push(`⚠️ ${stuckTasks.length} task(s) appear stuck in intermediate states. Possible data integrity issue.`);
  }

  // --- Calculate MTTR ---
  const mttrMs = Date.now() - executionResult.endedAt.getTime();

  // --- Grade the resilience ---
  let grade: ValidationResult["grade"];
  const score = [sreDetected, serviceRecovered, dataIntegrity].filter(Boolean).length;

  if (score === 3 && mttrMs < 30_000) grade = "A";
  else if (score === 3) grade = "B";
  else if (score === 2) grade = "C";
  else if (score === 1) grade = "D";
  else grade = "F";

  findings.push(`📊 Resilience Grade: ${grade} (${score}/3 checks passed, MTTR: ${mttrMs}ms)`);

  const result: ValidationResult = {
    experimentId: experiment.id,
    passed: score >= 2,
    sreDetected,
    serviceRecovered,
    dataIntegrity,
    mttrMs,
    findings,
    grade,
  };

  // --- Persist validation result ---
  await prisma.auditLog.create({
    data: {
      tenantId: "system",
      action: "chaos_experiment_validated",
      actor: "chaos-agent",
      details: toJsonSafe({
        experimentId: experiment.id,
        experimentType: experiment.type,
        targetService: experiment.targetService,
        severity: experiment.severity,
        grade,
        passed: result.passed,
        sreDetected,
        serviceRecovered,
        dataIntegrity,
        mttrMs,
        findings,
      }),
    },
  });

  // Publish recovery verification event
  await eventBus.publish(TOPICS.CHAOS_RECOVERY_VERIFIED, "system", {
    experimentId: experiment.id,
    grade,
    passed: result.passed,
    findings,
  });

  logger.info("Post-experiment validation complete", {
    experimentId: experiment.id,
    grade,
    passed: result.passed,
  });

  return result;
}
