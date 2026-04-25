// --- Tenant ---
export interface Tenant {
  id: string;
  name: string;
  plan: "starter" | "team" | "enterprise";
  githubInstallationId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  billingStatus: "active" | "past_due" | "canceled" | "incomplete";
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  autonomyLevel: "assisted" | "auto-pr" | "auto-merge";
  maxRetriesPerTask: number;
  allowedModules: string[];
  blockedModules: string[];
  notificationChannels: NotificationChannel[];
  monthlyBudgetCents: number;
  spentCents: number;
}

// --- Repository ---
export interface Repository {
  id: string;
  tenantId: string;
  fullName: string;
  defaultBranch: string;
  language: string;
  isActive: boolean;
  createdAt: Date;
}

// --- Task ---
export type TaskStatus =
  | "pending"
  | "triaging"
  | "planning"
  | "coding"
  | "reviewing"
  | "fixing"
  | "pr_creating"
  | "ci_monitoring"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskType = "bug" | "feature" | "refactor" | "unsafe" | "ui_design";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  tenantId: string;
  repositoryId: string;
  issueNumber: number;
  title: string;
  body: string;
  type: TaskType;
  riskLevel: RiskLevel;
  status: TaskStatus;
  currentIteration: number;
  maxIterations: number;
  metadata: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Execution ---
export type ExecutionStep =
  | "triage"
  | "plan"
  | "code"
  | "ui_code"
  | "review"
  | "fix"
  | "pr_create"
  | "ci_check";

export interface Execution {
  id: string;
  taskId: string;
  tenantId: string;
  step: ExecutionStep;
  status: "running" | "success" | "failed";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
  costCents: number;
  createdAt: Date;
}

// --- Agent Results ---
export interface PlanResult {
  steps: string[];
  impactedModules: string[];
  estimatedComplexity: "low" | "medium" | "high";
  rawPlan: string;
}

export interface CodeResult {
  diff: string;
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
}

export interface ReviewResult {
  status: "PASS" | "FAIL";
  feedback: string;
  issues: ReviewIssue[];
}

export interface ReviewIssue {
  severity: "error" | "warning" | "info";
  file: string;
  line: number;
  message: string;
}

// --- Pull Request ---
export type PullRequestStatus = "open" | "merged" | "closed" | "failed";

export interface PullRequest {
  id: string;
  taskId: string;
  tenantId: string;
  repositoryId: string;
  githubPrNumber: number;
  branchName: string;
  title: string;
  status: PullRequestStatus;
  url: string;
  iterations: number;
  createdAt: Date;
  mergedAt: Date | null;
}

// --- Audit Log ---
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  taskId: string | null;
  action: string;
  actor: "system" | "agent" | "user";
  details: Record<string, unknown>;
  timestamp: Date;
}

// --- Notifications ---
export type NotificationChannel = {
  type: "slack" | "email" | "webhook";
  target: string;
  events: string[];
};

// --- Metrics ---
export interface MetricPoint {
  tenantId: string;
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

// --- Events ---
export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  tenantId: string;
  payload: T;
  timestamp: Date;
  correlationId: string;
}

// --- Vector Memory ---
export interface CodeChunk {
  id: string;
  repositoryId: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
  metadata: Record<string, unknown>;
}

export interface VectorEntry {
  id: string;
  chunkId: string;
  repositoryId: string;
  embedding: number[];
  metadata: {
    filePath: string;
    language: string;
    startLine: number;
    endLine: number;
  };
}

export interface VectorSearchResult {
  chunk: CodeChunk;
  score: number;  // cosine similarity
}

export interface VectorQueryRequest {
  query: string;
  repositoryId: string;
  topK?: number;
  minScore?: number;
}
