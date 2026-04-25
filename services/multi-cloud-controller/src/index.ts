import dotenv from "dotenv";
import { getEventBus } from "@ai-dev/events";
import { createLogger } from "@ai-dev/logger";
import { TOPICS } from "@ai-dev/shared";
import prisma from "@ai-dev/database";

import { ICloudProvider, ServiceDeployment } from "./interfaces";
import { AWSProvider } from "./providers/aws";
import { GCPProvider } from "./providers/gcp";

dotenv.config();

const logger = createLogger("multi-cloud-controller");
const eventBus = getEventBus();

/**
 * Cross-Cloud Provisioning Factory
 * Reads the CLOUD_PROVIDER env variable to dynamically load the correct IaC wrapper.
 */
function getCloudProvider(): ICloudProvider {
  const providerType = (process.env.CLOUD_PROVIDER || "aws").toLowerCase();
  
  if (providerType === "gcp") return new GCPProvider();
  
  // Default to AWS
  return new AWSProvider();
}

async function start() {
  const provider = getCloudProvider();
  logger.info(`Cross-Cloud Controller initialized`, { provider: provider.getProviderName() });

  // Listening for high-level infra provisioning events from the Orchestrator
  // e.g. An agent needs a new isolated container to spin up
  const queueName = "q:multi-cloud:provisioning";
  
  // This is a simulation of the event bus subscription
  logger.info(`Listening for infrastructure events on queue`, { queueName });

  // Expose a public method or internal listener loop to handle provisioning
  setInterval(async () => {
    // Abstracted simulated payload
    const mockRequest: ServiceDeployment = {
      serviceId: `agent-worker-${Math.floor(Math.random() * 1000)}`,
      image: "amaswarn/worker:latest",
      cpu: 1024,
      memory: 2048,
      replicas: 1
    };

    try {
      const result = await provider.provisionCompute(mockRequest);
      
      // Emit Success Event
      await eventBus.publish(TOPICS.CLOUD_INFRA_PROVISIONED, "system", {
        status: "success",
        resourceDetails: result
      });

      logger.debug("Infrastructure provisioned successfully", result);

    } catch (error) {
      logger.error("Failed to provision infrastructure", { error: String(error) });
    }
  }, 60 * 1000); // Simulate one request every 60s
}

start().catch((err) => {
  logger.fatal("Multi-Cloud Controller failed to start", { error: err.message });
  process.exit(1);
});
