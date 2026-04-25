import OpenAI from "openai";
import { createLogger } from "@ai-dev/logger";
import type { FailurePattern, AnalysisReport } from "./failure-analyzer";
import { promptRegistry, type PromptVersion } from "./prompt-registry";

const logger = createLogger("agent-evolve:mutation-engine");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Prompt Mutation Engine.
 *
 * The "brain" of the self-evolution system. Takes failure analysis data
 * and uses AI to rewrite agent prompts to fix the identified weaknesses.
 *
 * This is meta-AI: an AI that improves other AIs.
 *
 * Safety guarantees:
 * 1. Mutations are PROPOSED, never auto-applied (human-in-the-loop)
 * 2. Every mutation includes a rollback path (version control)
 * 3. The mutation preserves the prompt's core identity (agent role)
 * 4. Changes are scoped — only the failing aspect is modified
 */

export interface PromptMutation {
  agentName: string;
  step: string;
  originalPrompt: string;
  mutatedPrompt: string;
  reason: string;
  targetedPattern: FailurePattern;
  expectedImprovement: string;
  riskAssessment: string;
  proposedVersion: PromptVersion;
}

/**
 * Generates targeted prompt mutations for each identified failure pattern.
 */
export async function generateMutations(report: AnalysisReport): Promise<PromptMutation[]> {
  const mutations: PromptMutation[] = [];

  // Only mutate patterns that are worth fixing (medium severity or above)
  const actionablePatterns = report.patterns.filter(
    (p) => p.severity === "critical" || p.severity === "high" || p.severity === "medium"
  );

  if (actionablePatterns.length === 0) {
    logger.info("No actionable failure patterns found. Prompts are performing well.");
    return [];
  }

  logger.info("Generating prompt mutations", { patterns: actionablePatterns.length });

  for (const pattern of actionablePatterns) {
    try {
      const mutation = await generateSingleMutation(pattern);
      if (mutation) mutations.push(mutation);
    } catch (err) {
      logger.error("Failed to generate mutation", {
        agent: pattern.agentName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info("Mutations generated", { total: mutations.length });
  return mutations;
}

async function generateSingleMutation(pattern: FailurePattern): Promise<PromptMutation | null> {
  const currentPrompt = promptRegistry.getActivePrompt(pattern.agentName, pattern.step);
  if (!currentPrompt) {
    logger.warn("No active prompt found for agent", { agent: pattern.agentName, step: pattern.step });
    return null;
  }

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o",
    temperature: 0.3, // Slightly creative but still controlled
    messages: [
      {
        role: "system",
        content: `You are a Prompt Engineering Specialist. Your job is to improve AI agent system prompts based on failure analysis data.

RULES:
1. Preserve the agent's core identity and role — do NOT change what the agent does, only HOW it does it
2. Be surgical — only modify the parts that address the identified failure pattern
3. Add specific instructions that would prevent the observed errors
4. Keep the prompt concise — do not add unnecessary verbosity
5. Maintain the same output format expectations

Output format (JSON):
{
  "mutatedPrompt": "the full revised system prompt",
  "reason": "concise explanation of what changed and why",
  "expectedImprovement": "what metric should improve",
  "riskAssessment": "what could go wrong with this change"
}`,
      },
      {
        role: "user",
        content: `CURRENT PROMPT for ${pattern.agentName} (step: ${pattern.step}):
---
${currentPrompt.content}
---

FAILURE ANALYSIS:
- Failure rate: ${(pattern.failureRate * 100).toFixed(1)}%
- Failed: ${pattern.failedExecutions} / ${pattern.totalExecutions} executions
- Severity: ${pattern.severity}
- Affected task types: ${pattern.affectedTaskTypes.join(", ")}
- Common errors:
${pattern.commonErrors.map((e) => `  • ${e}`).join("\n")}

Generate an improved version of this prompt that addresses these failures.`,
      },
    ],
  });

  const raw = response.choices[0].message.content || "{}";

  try {
    const parsed = JSON.parse(raw);

    // Register the proposed mutation in the version registry
    const proposedVersion = promptRegistry.proposeMutation(
      pattern.agentName,
      pattern.step,
      parsed.mutatedPrompt,
      parsed.reason
    );

    return {
      agentName: pattern.agentName,
      step: pattern.step,
      originalPrompt: currentPrompt.content,
      mutatedPrompt: parsed.mutatedPrompt,
      reason: parsed.reason,
      targetedPattern: pattern,
      expectedImprovement: parsed.expectedImprovement || "Reduced failure rate",
      riskAssessment: parsed.riskAssessment || "Unknown",
      proposedVersion,
    };
  } catch {
    logger.error("Failed to parse mutation response", { agent: pattern.agentName, raw: raw.substring(0, 200) });
    return null;
  }
}

/**
 * Applies a specific mutation, making it the active prompt.
 * This is the "commit" action — only called after human review or auto-approval.
 */
export function applyMutation(mutation: PromptMutation): boolean {
  const success = promptRegistry.applyMutation(
    mutation.agentName,
    mutation.step,
    mutation.proposedVersion.version
  );

  if (success) {
    logger.info("Mutation APPLIED", {
      agent: mutation.agentName,
      step: mutation.step,
      version: mutation.proposedVersion.version,
      reason: mutation.reason,
    });
  } else {
    logger.error("Mutation application FAILED", {
      agent: mutation.agentName,
      version: mutation.proposedVersion.version,
    });
  }

  return success;
}

/**
 * Rolls back a mutation to the previous version.
 */
export function rollbackMutation(agentName: string, step: string): boolean {
  const history = promptRegistry.getHistory(agentName, step);
  if (history.length < 2) {
    logger.warn("Cannot rollback — no previous version exists", { agentName, step });
    return false;
  }

  // Find the currently active version and roll back to the one before it
  const activeIndex = history.findIndex((v) => v.active);
  if (activeIndex <= 0) return false;

  const previousVersion = history[activeIndex - 1].version;
  return promptRegistry.rollback(agentName, step, previousVersion);
}
