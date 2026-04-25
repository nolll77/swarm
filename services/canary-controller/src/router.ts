import { createLogger } from "@ai-dev/logger";

const logger = createLogger("canary-controller:router");

/**
 * Traffic Router Interface
 * 
 * Abstracts the underlying infrastructure (AWS ALB, K8s Ingress, NGINX).
 * Used to shift traffic weights between the "stable" and "canary" targets.
 */
export interface ITrafficRouter {
  shiftTraffic(deploymentId: string, canaryWeightPercent: number): Promise<void>;
  rollback(deploymentId: string): Promise<void>;
  promoteToStable(deploymentId: string): Promise<void>;
}

/**
 * AWS Application Load Balancer Implementation
 * 
 * In production, this modifies the Listener Rules of an ALB to split
 * traffic between two distinct Target Groups (Stable vs Canary).
 */
export class ALBTrafficRouter implements ITrafficRouter {
  
  async shiftTraffic(deploymentId: string, canaryWeightPercent: number): Promise<void> {
    const stableWeight = 100 - canaryWeightPercent;
    
    // In a real implementation:
    // await elbv2.modifyListenerRule({
    //   RuleArn: config.albRuleArn,
    //   Actions: [{
    //     Type: "forward",
    //     ForwardConfig: {
    //       TargetGroups: [
    //         { TargetGroupArn: config.stableTargetGroupArn, Weight: stableWeight },
    //         { TargetGroupArn: config.canaryTargetGroupArn, Weight: canaryWeightPercent }
    //       ]
    //     }
    //   }]
    // });
    
    logger.info(`[ALB] Traffic shifted`, { 
      deploymentId, 
      stableWeight: `${stableWeight}%`, 
      canaryWeight: `${canaryWeightPercent}%` 
    });
  }

  async rollback(deploymentId: string): Promise<void> {
    // Force 100% traffic back to the stable Target Group
    logger.warn(`[ALB] ROLLBACK INITIATED. Routing 100% traffic to stable target group.`, { deploymentId });
    await this.shiftTraffic(deploymentId, 0);
  }

  async promoteToStable(deploymentId: string): Promise<void> {
    // The canary replaces the stable version. 
    // In infrastructure, the canary TG becomes the new stable TG.
    logger.info(`[ALB] PROMOTION COMPLETE. Canary is now the stable baseline.`, { deploymentId });
    await this.shiftTraffic(deploymentId, 100);
  }
}
