import { createLogger } from "@ai-dev/logger";
import type { ISecretProvider } from "./providers";

const logger = createLogger("secret-vault:client");

/**
 * VaultClient — The Single Access Point for All Secrets.
 *
 * Every agent uses this client instead of process.env directly.
 * This enforces the principle: "No secret ever lives in source code or env vars."
 *
 * Features:
 * - In-memory TTL cache: reduces AWS API calls + latency
 * - Access control list: scope which secrets each agent can read
 * - Structured access logging: every read is traced for SOC2
 * - Automatic cache invalidation on rotation events
 *
 * Usage (in any agent):
 *   const key = await vault.getSecret("openai/api-key");
 *   const openai = new OpenAI({ apiKey: key });
 */

interface CachedSecret {
  value: string;
  expiresAt: number; // Unix timestamp in ms
  fetchedAt: number;
}

interface AccessControl {
  allowedSecrets: string[];   // Glob patterns: "openai/*", "stripe/webhook-secret"
  agentName: string;
}

// Default TTL: 5 minutes. After this, the next read forces a fresh fetch.
// Rotation events immediately invalidate the cache entry.
const DEFAULT_TTL_MS = 5 * 60 * 1_000;

export class VaultClient {
  private provider: ISecretProvider;
  private cache: Map<string, CachedSecret> = new Map();
  private ttlMs: number;
  private accessControls: Map<string, AccessControl> = new Map();
  private accessLog: { secretId: string; agentName: string; timestamp: Date; hit: "cache" | "vault" }[] = [];

  constructor(provider: ISecretProvider, ttlMs: number = DEFAULT_TTL_MS) {
    this.provider = provider;
    this.ttlMs = ttlMs;

    // Register per-agent access control lists
    this.registerACLs();

    logger.info("VaultClient initialized", {
      provider: provider.name,
      ttlMs,
      aclsRegistered: this.accessControls.size,
    });
  }

  /**
   * Defines which secrets each agent is allowed to access.
   * Principle of Least Privilege: agents can only read what they need.
   */
  private registerACLs(): void {
    const acls: AccessControl[] = [
      {
        agentName: "agent-planner",
        allowedSecrets: ["openai/api-key"],
      },
      {
        agentName: "agent-coder",
        allowedSecrets: ["openai/api-key", "github/token"],
      },
      {
        agentName: "agent-reviewer",
        allowedSecrets: ["openai/api-key"],
      },
      {
        agentName: "agent-ui",
        allowedSecrets: ["openai/api-key"],
      },
      {
        agentName: "agent-sre",
        allowedSecrets: ["openai/api-key", "slack/webhook-url"],
      },
      {
        agentName: "billing-stripe",
        allowedSecrets: ["stripe/secret-key", "stripe/webhook-secret"],
      },
      {
        agentName: "soc2-collector",
        allowedSecrets: ["aws/s3-access-key", "aws/s3-secret-key"],
      },
      {
        agentName: "secret-vault", // The vault itself can access everything for rotation
        allowedSecrets: ["*"],
      },
      {
        agentName: "api-gateway",
        allowedSecrets: ["jwt/secret", "database/url"],
      },
    ];

    for (const acl of acls) {
      this.accessControls.set(acl.agentName, acl);
    }
  }

  /**
   * Checks if an agent is authorized to access a specific secret.
   */
  private isAuthorized(agentName: string, secretId: string): boolean {
    const acl = this.accessControls.get(agentName);
    if (!acl) return false;

    return acl.allowedSecrets.some((pattern) => {
      if (pattern === "*") return true;
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        return secretId.startsWith(prefix);
      }
      return pattern === secretId;
    });
  }

  /**
   * Primary API: Retrieve a secret by ID.
   *
   * @param secretId - Hierarchical secret identifier (e.g., "openai/api-key")
   * @param agentName - Name of the calling agent (for ACL + audit log)
   * @returns The secret value (never logged, never stored in DB)
   */
  async getSecret(secretId: string, agentName: string = "unknown"): Promise<string> {
    // 1. Authorization check
    if (!this.isAuthorized(agentName, secretId)) {
      logger.error("SECRET ACCESS DENIED", { secretId, agentName });
      this.accessLog.push({ secretId, agentName, timestamp: new Date(), hit: "vault" });
      throw new Error(`[Vault] ACCESS DENIED: agent '${agentName}' is not authorized to read '${secretId}'`);
    }

    // 2. Cache check
    const cached = this.cache.get(secretId);
    if (cached && cached.expiresAt > Date.now()) {
      this.accessLog.push({ secretId, agentName, timestamp: new Date(), hit: "cache" });
      logger.debug("Cache hit", { secretId, agentName, ttlRemainingS: Math.round((cached.expiresAt - Date.now()) / 1000) });
      return cached.value;
    }

    // 3. Fetch from vault provider
    logger.info("Cache miss — fetching from vault", { secretId, provider: this.provider.name, agentName });
    const value = await this.provider.getSecret(secretId);

    // 4. Cache the result
    this.cache.set(secretId, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      fetchedAt: Date.now(),
    });

    this.accessLog.push({ secretId, agentName, timestamp: new Date(), hit: "vault" });
    return value;
  }

  /**
   * Invalidates a cached secret (called when rotation events arrive).
   * Forces the next consumer to fetch the new value from the vault.
   */
  invalidateCache(secretId: string): void {
    const hadEntry = this.cache.delete(secretId);
    if (hadEntry) {
      logger.info("Cache invalidated after rotation", { secretId });
    }
  }

  /**
   * Invalidates all cache entries.
   */
  invalidateAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    logger.info("Full cache invalidated", { entriesCleared: count });
  }

  /**
   * Triggers immediate rotation for a secret.
   */
  async rotate(secretId: string): Promise<void> {
    await this.provider.rotateNow(secretId);
    this.invalidateCache(secretId);
    logger.info("Secret rotated and cache invalidated", { secretId });
  }

  /**
   * Returns the last N access log entries (for SOC2 audit exports).
   */
  getAccessLog(limit: number = 100) {
    return this.accessLog.slice(-limit);
  }

  /**
   * Returns cache status for monitoring dashboards.
   */
  getCacheStats() {
    const now = Date.now();
    let liveEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (entry.expiresAt > now) liveEntries++;
      else expiredEntries++;
    }

    return { totalEntries: this.cache.size, liveEntries, expiredEntries, ttlMs: this.ttlMs };
  }

  get providerName(): string {
    return this.provider.name;
  }
}
