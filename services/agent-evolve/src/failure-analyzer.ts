import { createLogger } from "@ai-dev/logger";
import prisma from "@ai-dev/database";

const logger = createLogger("agent-evolve:failure-analyzer");

/**
 * Failure Pattern Analyzer.
 *
 * Mines the execution history to identify RECURRING failure patterns.
 * This is NOT about individual bugs (that's Agent SRE's job).
 * This is about systemic weaknesses in how agents are prompted.
 *
 * Example insights:
 * - "agent-coder fails 40% of the time when the task involves database migrations"
 * - "agent-reviewer rejects 80% of plans that touch auth/ — the planner prompt
 *    doesn't account for security constraints"
 * - "agent-planner consistently underestimates steps for refactoring tasks"
 */

export interface FailurePattern {
  agentName: string;
  step: string;
  failureRate: number;          // 0-1 ratio
  totalExecutions: number;
  failedExecutions: number;
  commonErrors: string[];       // Deduplicated error messages
  affectedTaskTypes: string[];  // Which task types trigger failures most
  severity: "low" | "medium" | "high" | "critical";
}

export interface AnalysisReport {
  analyzedAt: Date;
  periodDays: number;
  totalExecutions: number;
  overallFailureRate: number;
  patterns: FailurePattern[];
  recommendations: string[];
}

/**
 * Analyzes the last N days of execution data to extract failure patterns.
 */
export async function analyzeFailurePatterns(periodDays: number = 30): Promise<AnalysisReport> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  logger.info("Starting failure pattern analysis", { since, periodDays });

  // Step 1: Fetch all executions in the analysis window
  const executions = await prisma.execution.findMany({
    where: { createdAt: { gte: since } },
    include: { task: true },
    orderBy: { createdAt: "desc" },
  });

  const totalExecutions = executions.length;
  if (totalExecutions === 0) {
    logger.info("No executions found in analysis window");
    return {
      analyzedAt: new Date(),
      periodDays,
      totalExecutions: 0,
      overallFailureRate: 0,
      patterns: [],
      recommendations: ["No execution data available. Run some tasks first."],
    };
  }

  // Step 2: Group by agent step (plan, code, review, ui_code, fix)
  const stepGroups = new Map<string, typeof executions>();
  for (const exec of executions) {
    const key = exec.step;
    if (!stepGroups.has(key)) stepGroups.set(key, []);
    stepGroups.get(key)!.push(exec);
  }

  // Step 3: Calculate failure rates per step
  const patterns: FailurePattern[] = [];

  for (const [step, group] of stepGroups.entries()) {
    const failed = group.filter((e) => e.status === "failed");
    const failureRate = failed.length / group.length;

    // Only report if failure rate is notable (>10%)
    if (failureRate < 0.10) continue;

    // Extract common error messages (deduplicated)
    const errorMap = new Map<string, number>();
    for (const exec of failed) {
      const msg = exec.errorMessage || "Unknown error";
      // Normalize: strip line numbers, file paths for deduplication
      const normalized = msg.replace(/at line \d+/g, "at line N").replace(/\/[\w/.-]+/g, "<path>");
      errorMap.set(normalized, (errorMap.get(normalized) || 0) + 1);
    }

    // Sort by frequency, keep top 5
    const commonErrors = [...errorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([msg, count]) => `[${count}x] ${msg}`);

    // Identify which task types fail most
    const taskTypeMap = new Map<string, number>();
    for (const exec of failed) {
      const taskType = (exec.task as any)?.type || "unknown";
      taskTypeMap.set(taskType, (taskTypeMap.get(taskType) || 0) + 1);
    }
    const affectedTaskTypes = [...taskTypeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);

    // Determine severity based on failure rate + volume
    let severity: FailurePattern["severity"];
    if (failureRate >= 0.5 && group.length >= 10) severity = "critical";
    else if (failureRate >= 0.3) severity = "high";
    else if (failureRate >= 0.2) severity = "medium";
    else severity = "low";

    const agentName = stepToAgentName(step);

    patterns.push({
      agentName,
      step,
      failureRate,
      totalExecutions: group.length,
      failedExecutions: failed.length,
      commonErrors,
      affectedTaskTypes,
      severity,
    });
  }

  // Sort patterns by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  patterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const overallFailureRate = executions.filter((e) => e.status === "failed").length / totalExecutions;

  const recommendations = generateRecommendations(patterns);

  logger.info("Failure analysis complete", {
    totalExecutions,
    overallFailureRate: `${(overallFailureRate * 100).toFixed(1)}%`,
    patternsFound: patterns.length,
    criticalPatterns: patterns.filter((p) => p.severity === "critical").length,
  });

  return {
    analyzedAt: new Date(),
    periodDays,
    totalExecutions,
    overallFailureRate,
    patterns,
    recommendations,
  };
}

function stepToAgentName(step: string): string {
  const map: Record<string, string> = {
    plan: "agent-planner",
    code: "agent-coder",
    review: "agent-reviewer",
    fix: "agent-coder",
    ui_code: "agent-ui",
  };
  return map[step] || `unknown-agent(${step})`;
}

function generateRecommendations(patterns: FailurePattern[]): string[] {
  const recs: string[] = [];

  for (const p of patterns) {
    if (p.severity === "critical") {
      recs.push(
        `🔴 CRITICAL: ${p.agentName} has a ${(p.failureRate * 100).toFixed(0)}% failure rate (${p.failedExecutions}/${p.totalExecutions}). Immediate prompt revision required.`
      );
    }

    if (p.step === "fix" && p.failureRate > 0.3) {
      recs.push(
        `⚠️ Auto-fix loop is failing ${(p.failureRate * 100).toFixed(0)}% of the time. The coder prompt may need stronger error-correction instructions.`
      );
    }

    if (p.step === "review" && p.failureRate > 0.4) {
      recs.push(
        `⚠️ Reviewer is rejecting ${(p.failureRate * 100).toFixed(0)}% of code. Either the coder prompt produces low-quality output, or the reviewer prompt is too strict.`
      );
    }

    if (p.affectedTaskTypes.includes("ui_design") && p.failureRate > 0.2) {
      recs.push(
        `🎨 UI tasks have elevated failure rates. Consider enriching the agent-ui prompt with more examples of React/Tailwind patterns.`
      );
    }
  }

  if (recs.length === 0) {
    recs.push("✅ No significant failure patterns detected. System is performing within acceptable parameters.");
  }

  return recs;
}
