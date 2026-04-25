import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";

dotenv.config();

const logger = createLogger("notification");
const eventBus = getEventBus();

// --- Notification Senders ---
async function sendSlack(webhookUrl: string, message: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    logger.info("Slack notification sent");
  } catch (err) {
    logger.error("Slack notification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // In production, use nodemailer or an email API (SendGrid, SES, etc.)
  logger.info("Email notification sent (simulated)", { to, subject });
}

async function sendWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    logger.info("Webhook notification sent", { url });
  } catch (err) {
    logger.error("Webhook notification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// --- Main ---
async function start() {
  logger.info("Notification Service starting...");

  await eventBus.subscribe(
    TOPICS.NOTIFICATION_SEND,
    "notification-group",
    "notification-1",
    async (event) => {
      const { type, message, taskId } = event.payload as any;
      const tenantId = event.tenantId;

      logger.info("Processing notification", { type, tenantId, taskId });

      const formattedMessage = `[AI Dev Platform] ${message}`;

      // Send to configured channels
      // In production, read tenant notification settings from DB
      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      if (slackUrl) {
        await sendSlack(slackUrl, formattedMessage);
      }

      const notifyEmail = process.env.NOTIFY_EMAIL;
      if (notifyEmail) {
        await sendEmail(notifyEmail, `AI Dev: ${type}`, formattedMessage);
      }

      const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;
      if (webhookUrl) {
        await sendWebhook(webhookUrl, {
          type,
          tenantId,
          taskId,
          message: formattedMessage,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("Notification Service failed to start", { error: err.message });
  process.exit(1);
});
