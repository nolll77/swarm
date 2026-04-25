import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  RotateSecretCommand,
  DescribeSecretCommand,
  type RotationRulesType,
} from "@aws-sdk/client-secrets-manager";
import { createLogger } from "@ai-dev/logger";

const logger = createLogger("secret-vault:providers");

/**
 * ISecretProvider — The Universal Vault Interface.
 *
 * Architecture Decision:
 * Every vault implementation (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
 * must implement this contract. This means the 11 agents that consume secrets
 * NEVER know which vault they're talking to. Swap from AWS to HCP Vault
 * by changing ONE env variable, zero code changes.
 */
export interface ISecretProvider {
  name: string;
  getSecret(secretId: string): Promise<string>;
  createSecret(secretId: string, value: string, description?: string): Promise<void>;
  updateSecret(secretId: string, value: string): Promise<void>;
  enableRotation(secretId: string, rotationDays: number): Promise<void>;
  rotateNow(secretId: string): Promise<void>;
  describe(secretId: string): Promise<SecretMetadata>;
}

export interface SecretMetadata {
  name: string;
  arn?: string;
  createdDate?: Date;
  lastChangedDate?: Date;
  lastRotatedDate?: Date;
  rotationEnabled: boolean;
  rotationDays?: number;
  tags: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 1: AWS Secrets Manager (Default Production Provider)
// ─────────────────────────────────────────────────────────────────────────────

export class AWSSecretsManagerProvider implements ISecretProvider {
  public readonly name = "aws-secrets-manager";
  private client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "eu-west-1",
      // Credentials auto-resolved from:
      // 1. IAM Role (ECS Task Role) — PREFERRED in production
      // 2. ENV vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) — dev only
    });
    logger.info("AWS Secrets Manager provider initialized", {
      region: process.env.AWS_REGION || "eu-west-1",
    });
  }

  async getSecret(secretId: string): Promise<string> {
    try {
      const cmd = new GetSecretValueCommand({ SecretId: secretId });
      const response = await this.client.send(cmd);
      const value = response.SecretString || Buffer.from(response.SecretBinary || "").toString("utf-8");
      logger.debug("Secret retrieved", { secretId, provider: this.name });
      return value;
    } catch (err: any) {
      // Surface the exact AWS error type for better alerting
      logger.error("Failed to retrieve secret from AWS", {
        secretId,
        errorCode: err.name,
        message: err.message,
      });
      throw new Error(`[AWS Vault] Cannot retrieve ${secretId}: ${err.name}`);
    }
  }

  async createSecret(secretId: string, value: string, description = ""): Promise<void> {
    const cmd = new CreateSecretCommand({
      Name: secretId,
      SecretString: value,
      Description: description,
      Tags: [
        { Key: "ManagedBy", Value: "ai-dev-saas" },
        { Key: "Service", Value: "secret-vault" },
        { Key: "Environment", Value: process.env.NODE_ENV || "development" },
      ],
    });
    await this.client.send(cmd);
    logger.info("Secret created in AWS", { secretId });
  }

  async updateSecret(secretId: string, value: string): Promise<void> {
    const cmd = new UpdateSecretCommand({
      SecretId: secretId,
      SecretString: value,
    });
    await this.client.send(cmd);
    logger.info("Secret updated in AWS", { secretId });
  }

  async enableRotation(secretId: string, rotationDays: number): Promise<void> {
    const rules: RotationRulesType = { AutomaticallyAfterDays: rotationDays };
    const cmd = new RotateSecretCommand({
      SecretId: secretId,
      RotationRules: rules,
    });
    await this.client.send(cmd);
    logger.info("Rotation enabled", { secretId, rotationDays });
  }

  async rotateNow(secretId: string): Promise<void> {
    const cmd = new RotateSecretCommand({ SecretId: secretId });
    await this.client.send(cmd);
    logger.info("Immediate rotation triggered", { secretId });
  }

  async describe(secretId: string): Promise<SecretMetadata> {
    const cmd = new DescribeSecretCommand({ SecretId: secretId });
    const r = await this.client.send(cmd);
    return {
      name: r.Name || secretId,
      arn: r.ARN,
      createdDate: r.CreatedDate,
      lastChangedDate: r.LastChangedDate,
      lastRotatedDate: r.LastRotatedDate,
      rotationEnabled: r.RotationEnabled || false,
      rotationDays: r.RotationRules?.AutomaticallyAfterDays,
      tags: Object.fromEntries((r.Tags || []).map((t) => [t.Key!, t.Value!])),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 2: HashiCorp Vault (Alternative / On-Premise)
// Implements same interface — swap by setting VAULT_PROVIDER=hashicorp
// ─────────────────────────────────────────────────────────────────────────────

export class HashiCorpVaultProvider implements ISecretProvider {
  public readonly name = "hashicorp-vault";
  private vaultAddress: string;
  private vaultToken: string;

  constructor() {
    this.vaultAddress = process.env.VAULT_ADDR || "http://vault:8200";
    this.vaultToken = process.env.VAULT_TOKEN || "";
    logger.info("HashiCorp Vault provider initialized", { address: this.vaultAddress });
  }

  private get headers(): Record<string, string> {
    return { "X-Vault-Token": this.vaultToken, "Content-Type": "application/json" };
  }

  async getSecret(secretId: string): Promise<string> {
    // KV v2 path: /v1/secret/data/<secretId>
    const url = `${this.vaultAddress}/v1/secret/data/${secretId}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) {
      throw new Error(`[HCP Vault] Cannot retrieve ${secretId}: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as any;
    const value = body?.data?.data?.value;
    if (!value) throw new Error(`[HCP Vault] Secret ${secretId} has no 'value' field in KV data`);

    logger.debug("Secret retrieved", { secretId, provider: this.name });
    return value;
  }

  async createSecret(secretId: string, value: string, _description?: string): Promise<void> {
    const url = `${this.vaultAddress}/v1/secret/data/${secretId}`;
    await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ data: { value } }),
    });
    logger.info("Secret created in HashiCorp Vault", { secretId });
  }

  async updateSecret(secretId: string, value: string): Promise<void> {
    return this.createSecret(secretId, value); // KV v2: POST overwrites
  }

  async enableRotation(_secretId: string, _rotationDays: number): Promise<void> {
    logger.warn("Rotation management on HashiCorp Vault requires a dedicated rotation lambda/agent. Configure via Vault Dynamic Secrets.");
  }

  async rotateNow(_secretId: string): Promise<void> {
    logger.warn("Manual rotation on HashiCorp Vault requires a dedicated rotation lambda/agent.");
  }

  async describe(secretId: string): Promise<SecretMetadata> {
    const url = `${this.vaultAddress}/v1/secret/metadata/${secretId}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`[HCP Vault] Cannot describe ${secretId}`);
    const body = (await res.json()) as any;
    return {
      name: secretId,
      createdDate: body?.data?.created_time ? new Date(body.data.created_time) : undefined,
      lastChangedDate: body?.data?.updated_time ? new Date(body.data.updated_time) : undefined,
      rotationEnabled: false,
      tags: {},
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 3: Environment Variables (Local Dev Only — NEVER in production)
// ─────────────────────────────────────────────────────────────────────────────

export class EnvVarProvider implements ISecretProvider {
  public readonly name = "env-var";

  constructor() {
    logger.warn("EnvVarProvider active — secrets read from process.env. NOT FOR PRODUCTION.");
  }

  async getSecret(secretId: string): Promise<string> {
    // Transform secret IDs to env var names: "openai/api-key" → "OPENAI_API_KEY"
    const envKey = secretId.toUpperCase().replace(/[/-]/g, "_");
    const value = process.env[envKey];
    if (!value) {
      throw new Error(`[EnvVar Vault] Secret '${secretId}' not found as env var '${envKey}'`);
    }
    return value;
  }

  async createSecret(_id: string, _value: string): Promise<void> {
    logger.warn("EnvVarProvider does not support createSecret. Set env var manually.");
  }
  async updateSecret(_id: string, _value: string): Promise<void> {
    logger.warn("EnvVarProvider does not support updateSecret.");
  }
  async enableRotation(_id: string, _days: number): Promise<void> {}
  async rotateNow(_id: string): Promise<void> {}
  async describe(secretId: string): Promise<SecretMetadata> {
    return { name: secretId, rotationEnabled: false, tags: {} };
  }
}

/**
 * Factory: Creates the correct provider based on environment configuration.
 */
export function createSecretProvider(): ISecretProvider {
  const providerName = process.env.VAULT_PROVIDER || "aws";

  switch (providerName) {
    case "aws":
      return new AWSSecretsManagerProvider();
    case "hashicorp":
      return new HashiCorpVaultProvider();
    case "env": // Local dev only
      return new EnvVarProvider();
    default:
      throw new Error(`Unknown vault provider: '${providerName}'. Use 'aws', 'hashicorp', or 'env'.`);
  }
}
