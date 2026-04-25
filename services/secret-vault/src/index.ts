import dotenv from "dotenv";
import cron from "node-cron";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";
import { createSecretProvider } from "./providers";
import { VaultClient } from "./vault-client";

dotenv.config();

const logger = createLogger("secret-vault");
const eventBus = getEventBus();

// ─────────────────────────────────────────────────────────────────────────────
// Mandatory Secret Catalog
// Every secret in the system is declared here with its rotation policy.
// This is the "single source of truth" for the platform's secret posture.
// ─────────────────────────────────────────────────────────────────────────────

interface ManagedSecret {
  id: string;                  // Hierarchical ID: "openai/api-key"
  description: string;
  rotationDays: number;        // 0 = no automatic rotation
  criticality: "low" | "medium" | "high" | "critical";
}

const MANAGED_SECRETS: ManagedSecret[] = [
  {
    id: "openai/api-key",
    description: "OpenAI API key used by all AI agents",
    rotationDays: 90,
    criticality: "critical",
  },
  {
    id: "stripe/secret-key",
    description: "Stripe API secret key for billing operations",
    rotationDays: 90,
    criticality: "critical",
  },
  {
    id: "stripe/webhook-secret",
    description: "Stripe webhook signing secret",
    rotationDays: 180,
    criticality: "high",
  },
  {
    id: "github/token",
    description: "GitHub PAT for creating pull requests",
    rotationDays: 60,
    criticality: "high",
  },
  {
    id: "jwt/secret",
    description: "JWT signing secret for API authentication",
    rotationDays: 30,
    criticality: "critical",
  },
  {
    id: "database/url",
    description: "PostgreSQL connection string",
    rotationDays: 180,
    criticality: "critical",
  },
  {
    id: "slack/webhook-url",
    description: "Slack incoming webhook for notifications",
    rotationDays: 365,
    criticality: "medium",
  },
  {
    id: "aws/s3-access-key",
    description: "AWS access key for S3 evidence uploads",
    rotationDays: 90,
    criticality: "high",
  },
  {
    id: "aws/s3-secret-key",
    description: "AWS secret key for S3 evidence uploads",
    rotationDays: 90,
    criticality: "high",
  },
];

async function start() {
  logger.info("Secret Vault Integration starting...");

  const provider = createSecretProvider();
  const vault = new VaultClient(provider);

  logger.info("Vault ready", {
    provider: vault.providerName,
    managedSecrets: MANAGED_SECRETS.length,
    catalog: MANAGED_SECRETS.map((s) => `${s.id} [${s.criticality}, rotate: ${s.rotationDays}d]`),
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Event 1: On-demand secret rotation request
  // ─────────────────────────────────────────────────────────────────────────
  await eventBus.subscribe(
    TOPICS.VAULT_ROTATION_REQUESTED,
    "vault-group",
    "vault-rotation-1",
    async (event) => {
      const { secretId, requestedBy, tenantId } = event.payload as any;

      logger.info("Manual rotation requested", { secretId, requestedBy });

      const managed = MANAGED_SECRETS.find((s) => s.id === secretId);
      if (!managed) {
        logger.error("Rotation requested for unmanaged secret", { secretId });
        return;
      }

      try {
        await vault.rotate(secretId);

        // Emit rotation completed event (agents subscribing will refresh their cached clients)
        await eventBus.publish(TOPICS.VAULT_SECRET_ROTATED, tenantId || "system", {
          secretId,
          rotatedBy: requestedBy || "manual",
          rotatedAt: new Date().toISOString(),
        }, event.correlationId);

        // SOC2 audit trail: log every rotation
        await prisma.auditLog.create({
          data: {
            tenantId: tenantId || "system",
            action: "secret_rotated",
            actor: requestedBy || "manual",
            details: {
              secretId,
              provider: vault.providerName,
              criticality: managed.criticality,
              requestedBy,
            },
          },
        });

        logger.info("Secret rotated successfully", { secretId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("Secret rotation failed", { secretId, error: msg });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Scheduled: Daily rotation check
  // Rotates secrets approaching their rotation deadline
  // ─────────────────────────────────────────────────────────────────────────
  const rotationSchedule = process.env.VAULT_ROTATION_CRON || "0 5 * * *"; // Daily 05:00 UTC
  cron.schedule(rotationSchedule, async () => {
    logger.info("Daily rotation check starting...");

    for (const secret of MANAGED_SECRETS) {
      if (secret.rotationDays === 0) continue;

      try {
        const meta = await provider.describe(secret.id).catch(() => null);
        if (!meta) {
          logger.warn("Secret not found in vault — consider creating it", { secretId: secret.id });
          continue;
        }

        const daysSinceRotation = meta.lastRotatedDate
          ? Math.floor((Date.now() - meta.lastRotatedDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const daysUntilDue = secret.rotationDays - daysSinceRotation;

        if (daysUntilDue <= 7) {
          // Warn 7 days before rotation is due
          logger.warn("Secret approaching rotation deadline", {
            secretId: secret.id,
            criticality: secret.criticality,
            daysUntilDue,
          });

          // Publish event so dashboards can show rotation warnings
          await eventBus.publish(TOPICS.VAULT_ROTATION_REQUESTED, "system", {
            secretId: secret.id,
            requestedBy: "scheduler",
            reason: `Rotation overdue by ${Math.abs(daysUntilDue)} days`,
          });
        }

        logger.debug("Secret rotation status", {
          secretId: secret.id,
          daysSinceRotation,
          daysUntilDue,
          rotationEnabled: meta.rotationEnabled,
        });
      } catch (err) {
        logger.error("Rotation check failed for secret", {
          secretId: secret.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info("Daily rotation check complete");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scheduled: Hourly SOC2 access log flush
  // Persists the in-memory access log to the database for compliance
  // ─────────────────────────────────────────────────────────────────────────
  cron.schedule("0 * * * *", async () => {
    const log = vault.getAccessLog(500);
    if (log.length === 0) return;

    await prisma.auditLog.create({
      data: {
        tenantId: "system",
        action: "vault_access_log_flushed",
        actor: "secret-vault",
        details: {
          period: "last_hour",
          accessCount: log.length,
          uniqueSecrets: [...new Set(log.map((e) => e.secretId))],
          cacheStats: vault.getCacheStats(),
        },
      },
    });

    logger.info("Access log flushed to audit trail", { entries: log.length });
  });

  // Log cache stats on startup
  const stats = vault.getCacheStats();
  logger.info("Secret Vault ready", {
    provider: vault.providerName,
    cacheStats: stats,
    rotationSchedule,
    managedSecretCount: MANAGED_SECRETS.length,
    criticalSecrets: MANAGED_SECRETS.filter((s) => s.criticality === "critical").length,
    note: "Set VAULT_PROVIDER=aws for production (IAM role required). Set VAULT_PROVIDER=env for local dev.",
  });
}

start().catch((err) => {
  logger.fatal("Secret Vault failed to start", { error: err.message });
  process.exit(1);
});
