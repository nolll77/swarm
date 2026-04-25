import { createLogger } from "@ai-dev/logger";

const logger = createLogger("agent-evolve:prompt-registry");

/**
 * Centralized Prompt Registry with Version Control.
 *
 * Every agent's system prompt is stored here with full version history.
 * When the mutation engine proposes a change, it creates a new version
 * without destroying the previous one — enabling instant rollback.
 *
 * This is the "genome" of the platform. Each prompt version is a "gene"
 * that determines how an agent thinks and acts.
 */

export interface PromptVersion {
  version: number;
  content: string;
  createdAt: Date;
  createdBy: "human" | "agent-evolve";
  reason: string;            // Why this version was created
  performanceDelta?: string; // "failure rate: 35% → 18%"
  active: boolean;
}

export interface AgentPrompt {
  agentName: string;
  step: string;              // "plan", "code", "review", "ui_code"
  versions: PromptVersion[];
  currentVersion: number;
}

/**
 * In-memory prompt registry.
 * Production: swap for a database-backed store (Prisma model).
 */
class PromptRegistry {
  private prompts: Map<string, AgentPrompt> = new Map();

  constructor() {
    this.seedDefaults();
  }

  /**
   * Seeds the registry with the current production prompts.
   * These are the "Version 1" baselines extracted from each agent's source code.
   */
  private seedDefaults(): void {
    this.register("agent-planner", "plan", {
      version: 1,
      content: `You are a senior technical planner. Given a GitHub issue, produce a structured implementation plan.

Output format (JSON):
{
  "steps": ["step 1", "step 2", ...],
  "impactedModules": ["module1", "module2"],
  "summary": "brief summary"
}

Be concise. Focus on actionable steps. Identify which code modules are impacted.`,
      createdAt: new Date("2025-01-01"),
      createdBy: "human",
      reason: "Initial baseline prompt",
      active: true,
    });

    this.register("agent-coder", "code", {
      version: 1,
      content: `You are a senior software engineer. Given a plan and existing codebase context, write production-ready code changes.

Output format: Unified diff (patch format).

Rules:
- Write clean, tested, documented code
- Follow existing patterns in the codebase
- Handle error cases explicitly
- Never introduce security vulnerabilities`,
      createdAt: new Date("2025-01-01"),
      createdBy: "human",
      reason: "Initial baseline prompt",
      active: true,
    });

    this.register("agent-reviewer", "review", {
      version: 1,
      content: `You are a Staff-level code reviewer. Analyze the proposed code changes for:
1. Correctness
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices

Output format (JSON):
{
  "approved": true/false,
  "score": 0-100,
  "issues": [{"severity": "critical|major|minor", "description": "..."}],
  "summary": "..."
}`,
      createdAt: new Date("2025-01-01"),
      createdBy: "human",
      reason: "Initial baseline prompt",
      active: true,
    });

    this.register("agent-ui", "ui_code", {
      version: 1,
      content: `You are a Senior Frontend Engineer specializing in React and TailwindCSS.
Transform design descriptions or screenshots into production-ready components.

MANDATORY STANDARDS:
- TailwindCSS utility classes (no custom CSS)
- W3C Accessibility (ARIA labels, semantic HTML)
- Mobile-first responsive design
- ALWAYS generate a companion .stories.tsx (Storybook) file`,
      createdAt: new Date("2025-01-01"),
      createdBy: "human",
      reason: "Initial baseline prompt",
      active: true,
    });

    logger.info("Prompt registry seeded", { agents: this.prompts.size });
  }

  /**
   * Registers a prompt version for an agent.
   */
  register(agentName: string, step: string, version: PromptVersion): void {
    const key = `${agentName}:${step}`;
    const existing = this.prompts.get(key);

    if (existing) {
      // Deactivate previous active version
      for (const v of existing.versions) {
        if (v.active) v.active = false;
      }
      existing.versions.push(version);
      existing.currentVersion = version.version;
    } else {
      this.prompts.set(key, {
        agentName,
        step,
        versions: [version],
        currentVersion: version.version,
      });
    }
  }

  /**
   * Gets the currently active prompt for an agent.
   */
  getActivePrompt(agentName: string, step: string): PromptVersion | null {
    const key = `${agentName}:${step}`;
    const prompt = this.prompts.get(key);
    if (!prompt) return null;
    return prompt.versions.find((v) => v.active) || null;
  }

  /**
   * Gets the full version history for an agent's prompt.
   */
  getHistory(agentName: string, step: string): PromptVersion[] {
    const key = `${agentName}:${step}`;
    const prompt = this.prompts.get(key);
    return prompt?.versions || [];
  }

  /**
   * Proposes a new prompt version (not yet active).
   * The mutation must be explicitly applied to become active.
   */
  proposeMutation(
    agentName: string,
    step: string,
    newContent: string,
    reason: string
  ): PromptVersion {
    const key = `${agentName}:${step}`;
    const existing = this.prompts.get(key);
    const nextVersion = existing ? existing.currentVersion + 1 : 1;

    const proposed: PromptVersion = {
      version: nextVersion,
      content: newContent,
      createdAt: new Date(),
      createdBy: "agent-evolve",
      reason,
      active: false, // NOT active until explicitly applied
    };

    if (existing) {
      existing.versions.push(proposed);
    } else {
      this.prompts.set(key, {
        agentName,
        step,
        versions: [proposed],
        currentVersion: 0, // No active version yet
      });
    }

    logger.info("Mutation proposed", { agentName, step, version: nextVersion, reason });
    return proposed;
  }

  /**
   * Applies a proposed mutation, making it the active prompt.
   */
  applyMutation(agentName: string, step: string, version: number): boolean {
    const key = `${agentName}:${step}`;
    const prompt = this.prompts.get(key);
    if (!prompt) return false;

    const target = prompt.versions.find((v) => v.version === version);
    if (!target) return false;

    // Deactivate all, activate target
    for (const v of prompt.versions) {
      v.active = false;
    }
    target.active = true;
    prompt.currentVersion = version;

    logger.info("Mutation applied", { agentName, step, version });
    return true;
  }

  /**
   * Rolls back to a specific version.
   */
  rollback(agentName: string, step: string, targetVersion: number): boolean {
    return this.applyMutation(agentName, step, targetVersion);
  }

  /**
   * Returns all registered agents and their current prompt versions.
   */
  listAll(): { agentName: string; step: string; currentVersion: number; totalVersions: number }[] {
    return [...this.prompts.values()].map((p) => ({
      agentName: p.agentName,
      step: p.step,
      currentVersion: p.currentVersion,
      totalVersions: p.versions.length,
    }));
  }
}

// Singleton instance
export const promptRegistry = new PromptRegistry();
