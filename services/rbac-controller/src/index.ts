import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { AccessEvaluator, AccessRequest, AccessResult } from "./evaluator";

dotenv.config();

const logger = createLogger("rbac-controller");
const eventBus = getEventBus();
const evaluator = new AccessEvaluator();

/**
 * RBAC Granulaire Engine
 * 
 * In a traditional REST architecture, RBAC runs synchronously at the API Gateway level.
 * In our Event-Driven architecture, critical mutating actions (deploy, secret rotate, mutate prompt)
 * are validated asynchronously or via direct service checks.
 * 
 * This service also centralizes Audit Logging for security compliance.
 */

async function start() {
  logger.info("RBAC Controller starting...");

  // Event Subscription: For critical actions requested via Event Bus
  // Example scenario: the UI fires "CANARY_DEPLOYMENT_REQUESTED" and we must validate it before
  // re-emitting "CANARY_DEPLOYMENT_STARTED" to the actual canary controller.
  
  // NOTE: For demonstration in our SaaS blueprint, we will expose a mock test loop 
  // that evaluates dummy requests every 30 seconds to simulate traffic.
  
  setInterval(async () => {
    // Simulate incoming edge requests
    const simulatedTraffic: AccessRequest[] = [
      { userId: "admin-1", tenantId: "tenant-A", requiredPermission: "deploy:trigger" },
      { userId: "dev-2", tenantId: "tenant-A", requiredPermission: "secrets:read" },
      { userId: "viewer-3", tenantId: "tenant-A", requiredPermission: "deploy:rollback" }, // Should fail
    ];

    for (const req of simulatedTraffic) {
      const result = await evaluator.evaluateAccess(req);

      // 1. Audit Log (SOC2 Compliance req: all access evaluations must be logged)
      await prisma.auditLog.create({
        data: {
          tenantId: req.tenantId,
          action: "rbac_evaluated",
          actor: req.userId,
          details: {
            permission: req.requiredPermission,
            granted: result.granted,
            reason: result.reason
          }
        }
      });

      // 2. Alert Generation for Violations
      if (!result.granted) {
        logger.warn("Security Alert: RBAC Violation", { request: req, result });
        
        await eventBus.publish(TOPICS.RBAC_EVALUATION_FAILED, req.tenantId, {
          userId: req.userId,
          attemptedPermission: req.requiredPermission,
          reason: result.reason,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    logger.debug("RBAC Evaluation cycle completed", { evaluateCount: simulatedTraffic.length });
  }, 30 * 1000);

  logger.info("RBAC Controller Ready", {
    rolesDefined: 4,
    permissionsTracked: 11
  });
}

start().catch((err) => {
  logger.fatal("RBAC Controller failed to start", { error: err.message });
  process.exit(1);
});
