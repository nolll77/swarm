import { createLogger } from "@ai-dev/logger";

const logger = createLogger("canary-controller:evaluator");

/**
 * Canary Health Evaluator
 * 
 * In a real-world scenario, this connects directly to Prometheus or Datadog
 * to evaluate the health of the "canary" deployment vs the "stable" deployment.
 * 
 * Key metrics evaluated:
 * 1. Error Rate (5xx responses)
 * 2. Latency (Apdex score or p95/p99)
 * 3. CPU/Memory saturation (to detect memory leaks in new code)
 */

export interface HealthMetrics {
  errorRate: number;      // percentage, e.g., 0.01 = 1%
  p95LatencyMs: number;
  cpuUtilization: number; // percentage
}

export interface EvaluationResult {
  isHealthy: boolean;
  score: number;          // 0-100
  reason?: string;
  metrics: HealthMetrics;
}

export class CanaryEvaluator {
  private readonly ERROR_RATE_THRESHOLD = 0.02;     // max 2% errors
  private readonly LATENCY_THRESHOLD_MS = 350;      // max 350ms p95 latency
  private readonly CPU_THRESHOLD = 0.85;            // max 85% CPU saturation

  /**
   * Fetches real-time metrics for a specific deployment version (simulated here)
   * In a real system, this would query the `metrics-collector` or Prometheus API.
   */
  async getMetrics(versionId: string): Promise<HealthMetrics> {
    logger.debug("Fetching metrics for version", { versionId });
    
    // Simulate metrics based on the version ID for demonstration purposes
    // "bad-deployment-*" will deterministically produce high error rates
    const isBadDeployment = versionId.includes("bad-deployment");
    
    // Add some random jitter
    const jitter = () => (Math.random() - 0.5) * 0.01;

    if (isBadDeployment) {
      // Simulate an unhealthy deployment (high latency, high errors)
      return {
        errorRate: 0.05 + jitter(),     // 5% error rate (violates 2% threshold)
        p95LatencyMs: 450 + (jitter() * 10000), // 450ms latency (violates 350ms threshold)
        cpuUtilization: 0.60 + jitter()
      };
    } else {
      // Simulate a healthy deployment
      return {
        errorRate: 0.005 + jitter(),    // 0.5% error rate (acceptable)
        p95LatencyMs: 120 + (jitter() * 1000),  // 120ms latency (acceptable)
        cpuUtilization: 0.45 + jitter()
      };
    }
  }

  /**
   * Evaluates if the current canary metrics meet the required thresholds
   * to continue the rollout.
   */
  async evaluateHealth(deploymentId: string, versionId: string): Promise<EvaluationResult> {
    const metrics = await this.getMetrics(versionId);
    
    let isHealthy = true;
    let score = 100;
    const reasons: string[] = [];

    // Check Error Rate
    if (metrics.errorRate > this.ERROR_RATE_THRESHOLD) {
      isHealthy = false;
      score -= 50;
      reasons.push(`Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold of ${(this.ERROR_RATE_THRESHOLD * 100).toFixed(2)}%`);
    }

    // Check Latency
    if (metrics.p95LatencyMs > this.LATENCY_THRESHOLD_MS) {
      isHealthy = false;
      score -= 30;
      reasons.push(`p95 Latency ${metrics.p95LatencyMs.toFixed(0)}ms exceeds threshold of ${this.LATENCY_THRESHOLD_MS}ms`);
    }

    // Check Saturation
    if (metrics.cpuUtilization > this.CPU_THRESHOLD) {
      isHealthy = false;
      score -= 20;
      reasons.push(`CPU Utilization ${(metrics.cpuUtilization * 100).toFixed(1)}% exceeds threshold of ${(this.CPU_THRESHOLD * 100).toFixed(1)}%`);
    }

    const result: EvaluationResult = {
      isHealthy,
      score: Math.max(0, score),
      reason: reasons.join(" | "),
      metrics
    };

    logger.info("Canary health evaluated", { 
      deploymentId, 
      versionId, 
      isHealthy, 
      score: result.score 
    });

    return result;
  }
}
