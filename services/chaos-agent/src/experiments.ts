import { createLogger } from "@ai-dev/logger";
import { randomUUID } from "crypto";

const logger = createLogger("chaos-agent:experiments");

/**
 * Chaos Engineering Experiment Catalog.
 *
 * Each experiment type simulates a real-world failure scenario
 * that the platform must survive without data loss or prolonged outage.
 * Inspired by Netflix's Chaos Monkey / Gremlin.
 */

export type ExperimentType =
  | "service_kill"        // Simulates a microservice crash (container restart)
  | "latency_injection"   // Adds artificial delay to inter-service communication
  | "db_connection_pool"  // Saturates database connection pool
  | "event_bus_partition"  // Simulates Redis pubsub network partition
  | "memory_pressure"     // Artificially consumes memory to test OOM handling
  | "disk_io_stress";     // Simulates slow disk I/O (affects logging, S3 uploads)

export type ExperimentSeverity = "minor" | "moderate" | "critical";

export interface ChaosExperiment {
  id: string;
  type: ExperimentType;
  severity: ExperimentSeverity;
  targetService: string;
  durationMs: number;
  description: string;
  blastRadius: string;          // What components are affected
  expectedRecovery: string;     // How the system should recover
  rollbackProcedure: string;    // How to manually undo if automatic recovery fails
}

/**
 * Pre-defined experiment blueprints.
 * Each targets a specific resilience property of the platform.
 */
const EXPERIMENT_CATALOG: Omit<ChaosExperiment, "id">[] = [
  {
    type: "service_kill",
    severity: "moderate",
    targetService: "agent-coder",
    durationMs: 30_000,
    description: "Simulates sudden crash of the Coder agent. Verifies that the Orchestrator detects the timeout and the SRE Agent generates an RCA.",
    blastRadius: "Tasks in 'coding' state will stall until recovery.",
    expectedRecovery: "Orchestrator timeout → SRE alert → Container auto-restart via Docker/K8s.",
    rollbackProcedure: "docker-compose restart agent-coder",
  },
  {
    type: "latency_injection",
    severity: "minor",
    targetService: "api-gateway",
    durationMs: 15_000,
    description: "Injects 2-5s artificial latency on API gateway responses. Tests client-side timeout handling and retry logic.",
    blastRadius: "All inbound API requests experience degraded response times.",
    expectedRecovery: "Metrics collector detects p99 latency spike → SRE alert.",
    rollbackProcedure: "Remove latency middleware; restart api-gateway.",
  },
  {
    type: "db_connection_pool",
    severity: "critical",
    targetService: "database",
    durationMs: 20_000,
    description: "Opens maximum connections to PostgreSQL, saturating the pool. Verifies that services fail gracefully with structured errors instead of hanging.",
    blastRadius: "All services depending on Prisma will receive connection errors.",
    expectedRecovery: "Connection pool drainer releases connections after durationMs → services auto-reconnect.",
    rollbackProcedure: "Kill saturator process; run `SELECT pg_terminate_backend(pid)` on idle connections.",
  },
  {
    type: "event_bus_partition",
    severity: "critical",
    targetService: "redis",
    durationMs: 10_000,
    description: "Simulates a Redis network partition. All event publishing/subscribing halts. Tests that agents queue events locally and replay after reconnection.",
    blastRadius: "Complete halt of inter-service event flow for durationMs.",
    expectedRecovery: "Redis reconnection → Event replay from local buffer → Pipeline resumes.",
    rollbackProcedure: "docker-compose restart redis",
  },
  {
    type: "memory_pressure",
    severity: "moderate",
    targetService: "agent-planner",
    durationMs: 25_000,
    description: "Allocates large memory buffers inside the Planner container. Tests OOM killer behavior and graceful shutdown handling.",
    blastRadius: "Planner may be killed by OOM → tasks in 'planning' state stall.",
    expectedRecovery: "Container OOM → K8s/Docker restart → Orchestrator retries planning step.",
    rollbackProcedure: "docker-compose restart agent-planner; free memory allocations.",
  },
  {
    type: "disk_io_stress",
    severity: "minor",
    targetService: "soc2-collector",
    durationMs: 15_000,
    description: "Simulates slow disk I/O for the SOC2 report writer. Tests that S3 upload timeouts are handled and reports are retried.",
    blastRadius: "Evidence report generation may timeout.",
    expectedRecovery: "S3 client retry logic kicks in → report eventually uploaded.",
    rollbackProcedure: "Kill I/O stress process; re-trigger EVIDENCE_RUN_NOW=true.",
  },
];

/**
 * Selects a random experiment from the catalog.
 */
export function pickRandomExperiment(): ChaosExperiment {
  const blueprint = EXPERIMENT_CATALOG[Math.floor(Math.random() * EXPERIMENT_CATALOG.length)];
  const experiment: ChaosExperiment = { ...blueprint, id: randomUUID() };
  logger.info("Experiment selected", { id: experiment.id, type: experiment.type, target: experiment.targetService });
  return experiment;
}

/**
 * Selects a specific experiment by type.
 */
export function pickExperimentByType(type: ExperimentType): ChaosExperiment | null {
  const blueprint = EXPERIMENT_CATALOG.find((e) => e.type === type);
  if (!blueprint) return null;
  return { ...blueprint, id: randomUUID() };
}

/**
 * Returns all available experiments for UI/dashboard display.
 */
export function listExperiments(): Omit<ChaosExperiment, "id">[] {
  return EXPERIMENT_CATALOG;
}
