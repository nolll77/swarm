import dotenv from "dotenv";
import cron from "node-cron";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS, toJsonSafe } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { DependencyScanner } from "./scanner";
import { PatchGenerator } from "./patcher";

dotenv.config();

const logger = createLogger("auto-patcher");
const eventBus = getEventBus();
const scanner = new DependencyScanner();
const patcher = new PatchGenerator();

/**
 * Autonomous Patching Engine
 * 
 * Periodically scans the infrastructure for known vulnerabilities (CVEs).
 * If a critical vulnerability is found, it completely bypasses human action:
 * it generates the patch, commits, creates a PR, and relies on CI + Canary
 * to safely roll the fix into production.
 */

async function start() {
  logger.info("Autonomous Patching Controller starting...");

  // Hardcoded repository list for demonstration
  const trackedRepositories = ["amaswarn-backend", "amaswarn-frontend"];

  // Cron Job: Runs daily at 02:00 UTC (or every minute for rapid demo purposes)
  const cronSchedule = process.env.PATCHER_CRON || "0 2 * * *";
  
  cron.schedule(cronSchedule, async () => {
    logger.info("Initiating Vulnerability Scan sweep...");

    for (const repoId of trackedRepositories) {
      try {
        const vulnerabilities = await scanner.scanForVulnerabilities(repoId);

        for (const vuln of vulnerabilities) {
          // If severity is critical, we take immediate autonomous action
          if (vuln.severity === "critical" || vuln.severity === "high") {
            
            // 1. Audit Log the Discovery
            await prisma.auditLog.create({
              data: {
                tenantId: "system",
                action: "vulnerability_detected",
                actor: "auto-patcher",
                details: toJsonSafe({ repoId, cve: vuln.id, package: vuln.package, severity: vuln.severity })
              }
            });

            // 2. Publish Detection Event (alerts Slack)
            await eventBus.publish(TOPICS.PATCH_VULNERABILITY_DETECTED, "system", {
              repositoryId: repoId,
              vulnerability: vuln
            });

            // 3. Generate Patch Payload
            const payload = await patcher.generatePatchPayload(vuln, repoId);

            // 4. Trigger Autonomous PR Creation
            // The PR service will pick this up and execute the git operations.
            await eventBus.publish(TOPICS.PATCH_PR_CREATED, "system", payload);

            logger.info("Autonomous Patch deployment initiated", { 
              cve: vuln.id, 
              prTitle: payload.title 
            });
          }
        }
      } catch (err) {
        logger.error("Scan failed for repository", { 
          repoId, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }
    
    logger.debug("Vulnerability sweep complete");
  });

  logger.info("Auto-Patcher Ready", {
    trackedRepositories: trackedRepositories.length,
    schedule: cronSchedule
  });
}

start().catch((err) => {
  logger.fatal("Auto-Patcher failed to start", { error: err.message });
  process.exit(1);
});
