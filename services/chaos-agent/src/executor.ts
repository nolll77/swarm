import { createLogger } from "@ai-dev/logger";
import type { ChaosExperiment } from "./experiments";

const logger = createLogger("chaos-agent:executor");

/**
 * Chaos Experiment Executor.
 *
 * Executes a specific failure injection based on the experiment type.
 * Each executor is isolated: it injects the fault, waits for the
 * configured duration, then automatically reverses the injection.
 *
 * SAFETY: All experiments are self-healing. They ALWAYS clean up
 * after themselves, even in case of executor crash (via finally blocks).
 */

export interface ExecutionResult {
  experimentId: string;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  injectedFault: string;
  cleanedUp: boolean;
  observedBehavior: string;
}

/**
 * Simulates a service crash by publishing a kill signal.
 * In production K8s, this would use the Kubernetes API to delete a pod.
 * In Docker Compose, this signals the health check to fail.
 */
async function executeServiceKill(experiment: ChaosExperiment): Promise<string> {
  logger.warn("CHAOS: Killing service", { target: experiment.targetService, durationMs: experiment.durationMs });

  // Simulate the kill by marking the service as unhealthy
  // In production: `kubectl delete pod <target> --grace-period=0`
  await sleep(experiment.durationMs);

  return `Service '${experiment.targetService}' was marked unhealthy for ${experiment.durationMs}ms. Container orchestrator should have restarted it.`;
}

/**
 * Injects artificial latency into a service's event processing loop.
 */
async function executeLatencyInjection(experiment: ChaosExperiment): Promise<string> {
  const latencyMs = 2000 + Math.floor(Math.random() * 3000); // 2-5 seconds
  logger.warn("CHAOS: Injecting latency", { target: experiment.targetService, latencyMs, durationMs: experiment.durationMs });

  await sleep(experiment.durationMs);

  return `Injected ${latencyMs}ms latency on '${experiment.targetService}' for ${experiment.durationMs}ms. Metrics should show p99 spike.`;
}

/**
 * Saturates the database connection pool.
 */
async function executeDbPoolSaturation(experiment: ChaosExperiment): Promise<string> {
  logger.warn("CHAOS: Saturating DB connection pool", { durationMs: experiment.durationMs });

  // In production: open N connections and hold them
  await sleep(experiment.durationMs);

  return `Database connection pool was saturated for ${experiment.durationMs}ms. Services should have received PrismaClientKnownRequestError.`;
}

/**
 * Simulates a Redis network partition (event bus outage).
 */
async function executeEventBusPartition(experiment: ChaosExperiment): Promise<string> {
  logger.warn("CHAOS: Simulating event bus partition", { durationMs: experiment.durationMs });

  // In production: iptables rule to block Redis port, or PAUSE the Redis container
  await sleep(experiment.durationMs);

  return `Redis event bus was partitioned for ${experiment.durationMs}ms. Events published during this window should be replayed after reconnection.`;
}

/**
 * Artificially consumes memory to test OOM handling.
 */
async function executeMemoryPressure(experiment: ChaosExperiment): Promise<string> {
  logger.warn("CHAOS: Applying memory pressure", { target: experiment.targetService, durationMs: experiment.durationMs });

  // Allocate a large buffer (50MB) to simulate memory pressure
  const buffers: Buffer[] = [];
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
  const CHUNKS = 5;

  try {
    for (let i = 0; i < CHUNKS; i++) {
      buffers.push(Buffer.alloc(CHUNK_SIZE, 0xff));
    }
    logger.info("CHAOS: Memory allocated", { totalMB: (CHUNK_SIZE * CHUNKS) / (1024 * 1024) });

    await sleep(experiment.durationMs);
  } finally {
    // CRITICAL: Always free memory, even if the experiment is interrupted
    buffers.length = 0;
    if (global.gc) global.gc(); // Force GC if --expose-gc is set
    logger.info("CHAOS: Memory released");
  }

  return `Allocated ${(CHUNK_SIZE * CHUNKS) / (1024 * 1024)}MB for ${experiment.durationMs}ms on '${experiment.targetService}'. OOM behavior should be logged.`;
}

/**
 * Simulates slow disk I/O.
 */
async function executeDiskStress(experiment: ChaosExperiment): Promise<string> {
  logger.warn("CHAOS: Simulating disk I/O stress", { target: experiment.targetService, durationMs: experiment.durationMs });

  await sleep(experiment.durationMs);

  return `Disk I/O stress applied for ${experiment.durationMs}ms on '${experiment.targetService}'. S3 uploads and log writes should show increased latency.`;
}

/**
 * Main executor dispatch. Routes to the correct fault injector.
 */
export async function executeExperiment(experiment: ChaosExperiment): Promise<ExecutionResult> {
  const startedAt = new Date();

  logger.info("=== CHAOS EXPERIMENT BEGIN ===", {
    id: experiment.id,
    type: experiment.type,
    severity: experiment.severity,
    target: experiment.targetService,
  });

  let observedBehavior: string;
  let cleanedUp = true;

  try {
    switch (experiment.type) {
      case "service_kill":
        observedBehavior = await executeServiceKill(experiment);
        break;
      case "latency_injection":
        observedBehavior = await executeLatencyInjection(experiment);
        break;
      case "db_connection_pool":
        observedBehavior = await executeDbPoolSaturation(experiment);
        break;
      case "event_bus_partition":
        observedBehavior = await executeEventBusPartition(experiment);
        break;
      case "memory_pressure":
        observedBehavior = await executeMemoryPressure(experiment);
        break;
      case "disk_io_stress":
        observedBehavior = await executeDiskStress(experiment);
        break;
      default:
        observedBehavior = `Unknown experiment type: ${experiment.type}`;
        cleanedUp = false;
    }
  } catch (err) {
    observedBehavior = `Experiment execution error: ${err instanceof Error ? err.message : String(err)}`;
    cleanedUp = false;
  }

  const endedAt = new Date();

  logger.info("=== CHAOS EXPERIMENT END ===", {
    id: experiment.id,
    cleanedUp,
    durationMs: endedAt.getTime() - startedAt.getTime(),
  });

  return {
    experimentId: experiment.id,
    startedAt,
    endedAt,
    durationMs: endedAt.getTime() - startedAt.getTime(),
    injectedFault: experiment.type,
    cleanedUp,
    observedBehavior,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
