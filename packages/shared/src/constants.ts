// --- Event Topics ---
export const TOPICS = {
  TASK_CREATED: "task.created",
  TASK_ROUTED: "task.routed",
  PIPELINE_PLAN_REQUESTED: "pipeline.plan_requested",
  PLAN_GENERATED: "plan.generated",
  PIPELINE_CODE_REQUESTED: "pipeline.code_requested",
  CODE_GENERATED: "code.generated",
  PIPELINE_UI_CODE_REQUESTED: "pipeline.ui_code_requested",
  UI_CODE_GENERATED: "ui_code.generated",
  PIPELINE_REVIEW_REQUESTED: "pipeline.review_requested",
  REVIEW_REQUESTED: "review.requested",
  REVIEW_COMPLETED: "review.completed",
  COMPLIANCE_REVIEW_COMPLETED: "compliance.review_completed",
  PIPELINE_FIX_REQUESTED: "pipeline.fix_requested",
  PIPELINE_PR_REQUESTED: "pipeline.pr_requested",
  PR_CREATED: "pr.created",
  CI_CHECK_RECEIVED: "ci.check_received",
  CI_PASSED: "ci.passed",
  CI_FAILED: "ci.failed",
  PIPELINE_COMPLETED: "pipeline.completed",
  PIPELINE_FAILED: "pipeline.failed",
  NOTIFICATION_SEND: "notification.send",
  METRIC_RECORDED: "metric.recorded",
  SRE_INCIDENT_DETECTED: "sre.incident_detected",
  SRE_RCA_GENERATED: "sre.rca_generated",
  BILLING_LIMIT_REACHED: "billing.limit_reached",
  REPO_INDEX_REQUESTED: "vector.repo_index_requested",
  REPO_INDEX_COMPLETED: "vector.repo_index_completed",
  VECTOR_QUERY_REQUESTED: "vector.query_requested",
  VECTOR_QUERY_RESULT: "vector.query_result",
  CHAOS_EXPERIMENT_STARTED: "chaos.experiment_started",
  CHAOS_EXPERIMENT_COMPLETED: "chaos.experiment_completed",
  CHAOS_RECOVERY_VERIFIED: "chaos.recovery_verified",
  PROMPT_ANALYSIS_TRIGGERED: "evolve.analysis_triggered",
  PROMPT_MUTATION_PROPOSED: "evolve.mutation_proposed",
  PROMPT_MUTATION_APPLIED: "evolve.mutation_applied",
  VAULT_SECRET_ROTATED: "vault.secret_rotated",
  VAULT_SECRET_ACCESS_DENIED: "vault.secret_access_denied",
  VAULT_ROTATION_REQUESTED: "vault.rotation_requested",
  CANARY_DEPLOYMENT_STARTED: "canary.deployment_started",
  CANARY_TRAFFIC_SHIFTED: "canary.traffic_shifted",
  CANARY_ROLLBACK_TRIGGERED: "canary.rollback_triggered",
  CANARY_PROMOTION_COMPLETED: "canary.promotion_completed",
  RBAC_EVALUATION_FAILED: "rbac.evaluation_failed",
  RBAC_ROLE_ASSIGNED: "rbac.role_assigned",
  RBAC_AUDIT_LOGGED: "rbac.audit_logged",
  PATCH_VULNERABILITY_DETECTED: "patch.vulnerability_detected",
  PATCH_PR_CREATED: "patch.pr_created",
  PATCH_FAILED: "patch.failed",
  CLOUD_INFRA_PROVISIONED: "cloud.infra_provisioned",
  CLOUD_MIGRATION_STARTED: "cloud.migration_started",
} as const;

// --- Task Statuses ---
export const TASK_STATUSES = {
  PENDING: "pending",
  TRIAGING: "triaging",
  PLANNING: "planning",
  CODING: "coding",
  REVIEWING: "reviewing",
  FIXING: "fixing",
  PR_CREATING: "pr_creating",
  CI_MONITORING: "ci_monitoring",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

// --- Risk Thresholds ---
export const RISK_CONFIG = {
  HIGH_RISK_MODULES: ["auth", "billing", "payment", "security", "infra"],
  MEDIUM_RISK_MODULES: ["api", "database", "migration"],
  MAX_AUTO_FIX_ITERATIONS: 3,
  MAX_TASK_AGE_HOURS: 24,
  DEFAULT_MODEL: "gpt-4o",
  FALLBACK_MODEL: "gpt-4o-mini",
} as const;

// --- Embedding Configuration ---
export const EMBEDDING_CONFIG = {
  MODEL: "text-embedding-3-small",
  DIMENSIONS: 1536,
  CHUNK_SIZE: 800,       // characters per chunk
  CHUNK_OVERLAP: 100,    // overlap between chunks for context continuity
  MAX_CHUNKS_PER_FILE: 50,
  TOP_K_RESULTS: 10,     // number of results returned per semantic query
  SIMILARITY_THRESHOLD: 0.72,  // minimum cosine similarity to consider relevant
} as const;

// --- HTTP Status ---
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;
