import dotenv from "dotenv";
import cron from "node-cron";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { CanaryEvaluator } from "./evaluator";
import { ALBTrafficRouter } from "./router";

dotenv.config();

const logger = createLogger("canary-controller");
const eventBus = getEventBus();
const evaluator = new CanaryEvaluator();
const router = new ALBTrafficRouter();

/**
 * Canary Release State Machine
 * 
 * Manages the progressive rollout of new code versions.
 * Safely ramps up traffic (5% -> 10% -> 50% -> 100%) while continuously
 * monitoring health metrics. Automatically triggers a rollback (0%) if 
 * anomaly thresholds are breached.
 */

// Define standard progressive steps
const TRAFFIC_STEPS = [5, 10, 25, 50, 100]; 

interface ActiveCanary {
  deploymentId: string;
  versionId: string;
  stepIndex: number;          // Index in TRAFFIC_STEPS
  startedAt: Date;
  status: "running" | "rolled_back" | "promoted";
}

// In-memory state (In prod, back this with Redis or PostgreSQL)
const activeDeployments = new Map<string, ActiveCanary>();

async function start() {
  logger.info("Canary Release Controller starting...");

  // Listen for new deployments triggered by the CI/CD pipeline
  await eventBus.subscribe(
    TOPICS.CANARY_DEPLOYMENT_STARTED,
    "canary-group",
    "canary-trigger",
    async (event) => {
      const { deploymentId, versionId } = event.payload as any;
      
      logger.info("New Canary Deployment Detected", { deploymentId, versionId });
      
      const canary: ActiveCanary = {
        deploymentId,
        versionId,
        stepIndex: 0,
        startedAt: new Date(),
        status: "running"
      };
      
      activeDeployments.set(deploymentId, canary);
      
      // Execute the first shift immediately (e.g., 5% traffic)
      await advanceCanary(canary);
    }
  );

  /**
   * The Control Loop
   * Runs every minute. Evaluates metrics for all active canary deployments.
   */
  cron.schedule("* * * * *", async () => {
    logger.debug("Running canary control loop evaluation");
    
    for (const [id, canary] of activeDeployments.entries()) {
      if (canary.status !== "running") continue;
      
      const currentWeight = TRAFFIC_STEPS[canary.stepIndex];
      logger.info(`Evaluating Canary [${canary.deploymentId}] at ${currentWeight}% traffic`);
      
      const result = await evaluator.evaluateHealth(canary.deploymentId, canary.versionId);
      
      // Save audit log of the evaluation
      await prisma.auditLog.create({
        data: {
          tenantId: "system",
          action: "canary_health_evaluated",
          actor: "canary-controller",
          details: {
            deploymentId: canary.deploymentId,
            versionId: canary.versionId,
            currentWeight,
            isHealthy: result.isHealthy,
            score: result.score,
            reason: result.reason ?? null,
            metrics: result.metrics as unknown as Record<string, unknown>
          } as unknown as Record<string, unknown>
        }
      });

      if (!result.isHealthy) {
        // FATAL: The canary introduced errors or latency. Trigger automatic rollback.
        logger.error(`🚨 CANARY HEALTH CHECK FAILED 🚨`, { 
          deploymentId: canary.deploymentId, 
          reason: result.reason 
        });
        
        await router.rollback(canary.deploymentId);
        canary.status = "rolled_back";
        activeDeployments.set(id, canary);
        
        await eventBus.publish(TOPICS.CANARY_ROLLBACK_TRIGGERED, "system", {
          deploymentId: canary.deploymentId,
          versionId: canary.versionId,
          failedAtWeight: currentWeight,
          reason: result.reason
        });
        
      } else {
        // HEALTHY: Consider advancing to the next traffic tier
        // (In a real system, we'd also check if it's been at this tier long enough)
        canary.stepIndex++;
        
        if (canary.stepIndex >= TRAFFIC_STEPS.length) {
          // Final stage reached
          await router.promoteToStable(canary.deploymentId);
          canary.status = "promoted";
          activeDeployments.set(id, canary);
          
          await eventBus.publish(TOPICS.CANARY_PROMOTION_COMPLETED, "system", {
            deploymentId: canary.deploymentId,
            versionId: canary.versionId
          });
          
        } else {
          // Advance to next intermediate step
          await advanceCanary(canary);
        }
      }
    }
  });

  logger.info("Canary Controller Ready", {
    strategy: "progressive",
    steps: TRAFFIC_STEPS.map(s => `${s}%`).join(" -> ")
  });
}

/**
 * Executes a traffic shift and emits the corresponding event
 */
async function advanceCanary(canary: ActiveCanary) {
  const targetWeight = TRAFFIC_STEPS[canary.stepIndex];
  await router.shiftTraffic(canary.deploymentId, targetWeight);
  
  await eventBus.publish(TOPICS.CANARY_TRAFFIC_SHIFTED, "system", {
    deploymentId: canary.deploymentId,
    versionId: canary.versionId,
    newWeightPercent: targetWeight
  });
}

start().catch((err) => {
  logger.fatal("Canary Controller failed to start", { error: err.message });
  process.exit(1);
});
