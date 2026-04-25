import dotenv from "dotenv";
import Stripe from "stripe";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

// Start Elite Stripe Service
dotenv.config();

const logger = createLogger("billing-stripe");
const eventBus = getEventBus();
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_123";
const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });

/**
 * Handles incoming Stripe Webhooks
 * Specifically looking at `invoice.payment_succeeded` and `invoice.payment_failed`
 * to adjust the tenant's `billingStatus`.
 */
async function processWebhook(eventBody: any) {
  // In a real API, this would be an HTTP endpoint.
  // For the sake of architecture, we mock the webhook payload processing.
  if (eventBody.type === "invoice.payment_succeeded") {
    const customerId = eventBody.data.object.customer;
    await handlePaymentSuccess(customerId);
  } else if (eventBody.type === "invoice.payment_failed") {
    const customerId = eventBody.data.object.customer;
    await handlePaymentFailure(customerId);
  }
}

async function handlePaymentSuccess(stripeCustomerId: string) {
  logger.info("Payment succeeded event received", { stripeCustomerId });
  const tenant = await prisma.tenant.findUnique({ where: { stripeCustomerId } });
  
  if (!tenant) return;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { billingStatus: "active" }
  });
}

async function handlePaymentFailure(stripeCustomerId: string) {
  logger.info("Payment failed event received", { stripeCustomerId });
  const tenant = await prisma.tenant.findUnique({ where: { stripeCustomerId } });
  
  if (!tenant) return;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { billingStatus: "past_due" }
  });

  // Notify the system that billing limits are effectively breached
  await eventBus.publish(TOPICS.BILLING_LIMIT_REACHED, tenant.id, {
    tenantId: tenant.id,
    reason: "payment_failed"
  });
}

async function start() {
  logger.info("Stripe Billing Connector starting...");

  // Subscribe to internal metrics events to enforce "Hard Limits" in real-time
  // Every time a task or execution uses credits, we check limits.
  await eventBus.subscribe(
    TOPICS.METRIC_RECORDED,
    "billing-group",
    "billing-worker-1",
    async (event) => {
      const { tenantId, costCents } = event.payload as any;
      
      if (!costCents || costCents <= 0) return;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, spentCents: true, monthlyBudgetCents: true, billingStatus: true }
      });

      if (!tenant) return;

      // Atomic update of the spent amount
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: { spentCents: { increment: costCents } }
      });

      // Check Hard Limit
      if (updatedTenant.spentCents >= updatedTenant.monthlyBudgetCents && updatedTenant.billingStatus === "active") {
        logger.warn("Tenant has reached its hard billing limit", { tenantId });
        
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { billingStatus: "past_due" }
        });

        await eventBus.publish(TOPICS.BILLING_LIMIT_REACHED, tenant.id, {
          tenantId: tenant.id,
          reason: "budget_exceeded"
        });
      }
    }
  );
}

start().catch((err) => {
  logger.fatal("Stripe Connector failed to start", { error: err.message });
  process.exit(1);
});

// Export processWebhook for the simulated HTTP API Gateway to call into
export { processWebhook };
