import dotenv from "dotenv";
import cron from "node-cron";
import { createLogger } from "@ai-dev/logger";
import prisma from "@ai-dev/database";
import { collectEvidence } from "./evidence-engine";
import { generateSOC2Report } from "./report-generator";
import { uploadReport } from "./s3-uploader";

dotenv.config();

const logger = createLogger("soc2-collector");

/**
 * Core pipeline: Collect → Generate → Upload → Persist record
 */
export async function runEvidenceCollection(
  period: string,
  tenantId?: string
): Promise<void> {
  logger.info("Starting SOC2 Evidence Collection", { period, tenantId });

  // Step 1: Create a tracking record immediately so we know a run is in progress
  const reportRecord = await prisma.evidenceReport.create({
    data: {
      tenantId: tenantId ?? null,
      period,
      reportType: "soc2_type2",
      status: "generating",
    },
  });

  try {
    // Step 2: Collect all structured evidence from the DB
    const evidence = await collectEvidence(period, tenantId);

    // Step 3: Generate the Markdown report from the structured evidence
    const reportMarkdown = generateSOC2Report(evidence);

    // Step 4: Upload to S3 (immutable, auditor-accessible)
    const s3Key = `soc2/${period}/${tenantId ?? "platform"}/${reportRecord.id}.md`;
    await uploadReport(s3Key, reportMarkdown);

    // Step 5: Update the DB record with the result
    await prisma.evidenceReport.update({
      where: { id: reportRecord.id },
      data: {
        status: "ready",
        s3Key,
        auditLogCount: evidence.auditLogs.length,
        taskCount: evidence.tasks.length,
      },
    });

    logger.info("SOC2 Evidence Report successfully generated", {
      period,
      tenantId,
      reportId: reportRecord.id,
      s3Key,
      auditLogCount: evidence.auditLogs.length,
      taskCount: evidence.tasks.length,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await prisma.evidenceReport.update({
      where: { id: reportRecord.id },
      data: { status: "failed" },
    });

    logger.error("SOC2 Evidence Collection failed", { period, tenantId, error: errorMsg });
    throw err;
  }
}

async function start() {
  logger.info("SOC2 Automated Evidence Collector starting...");

  // --- Nightly scheduled job ---
  // Runs at 02:00 AM UTC every day. Generates the previous month's report
  // on the 1st day of each month for ISO 27001 / SOC2 Type II compliance windows.
  cron.schedule("0 2 1 * *", async () => {
    const now = new Date();
    // Previous month period
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    logger.info("Cron: generating monthly evidence report", { period });

    try {
      // 1. Platform-wide report
      await runEvidenceCollection(period);

      // 2. Per-tenant reports
      const tenants = await prisma.tenant.findMany({ select: { id: true } });
      for (const tenant of tenants) {
        await runEvidenceCollection(period, tenant.id);
      }
    } catch (err) {
      logger.error("Scheduled evidence collection run failed", { period });
    }
  });

  // --- On-demand support ---
  // If EVIDENCE_RUN_NOW is set, generate for the previous month immediately
  // Useful for initial bootstrapping or on-demand auditor requests.
  if (process.env.EVIDENCE_RUN_NOW === "true") {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    logger.info("EVIDENCE_RUN_NOW: triggering immediate collection", { period });
    await runEvidenceCollection(period).catch((e) =>
      logger.error("Immediate evidence collection failed", { error: e.message })
    );
  }

  logger.info("SOC2 Collector ready. Cron scheduled at 02:00 UTC on the 1st of every month.");
}

start().catch((err) => {
  logger.fatal("SOC2 Collector failed to start", { error: err.message });
  process.exit(1);
});
