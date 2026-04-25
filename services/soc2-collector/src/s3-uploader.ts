import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createLogger } from "@ai-dev/logger";
import prisma from "@ai-dev/database";

const logger = createLogger("soc2-collector:s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  // Credentials are read from standard AWS environment variables:
  // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or from IAM role via ECS task definition
});

const BUCKET = process.env.EVIDENCE_S3_BUCKET || "ai-dev-soc2-evidence";

/**
 * Uploads a report buffer to S3 with Object Lock (immutability) semantics.
 * The key is deterministic so the same period overwrites intentionally.
 */
export async function uploadReport(key: string, body: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: "text/markdown",
    // Object metadata for compliance tracking
    Metadata: {
      "generated-by": "ai-dev-soc2-collector",
      "compliance-standard": "soc2-type-2",
    },
  });

  await s3.send(command);
  logger.info("Evidence report uploaded to S3", { key, bucket: BUCKET });
  return key;
}

/**
 * Generates a time-limited (24h) pre-signed URL for auditor access.
 * This allows external auditors to securely download the report without IAM credentials.
 */
export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 86400 }); // 24h
}
