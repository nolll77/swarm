import { Worker } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { PipelineOrchestrator } from "./pipeline/orchestrator";

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const orchestrator = new PipelineOrchestrator();

const worker = new Worker(
  "ai-tasks",
  async (job) => {
    console.log(`Processing job ${job.id} for tenant ${job.data.tenantId}`);
    try {
      await orchestrator.execute(job.data);
      console.log(`Successfully completed job ${job.id}`);
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      throw error;
    }
  },
  { connection }
);

console.log("Worker started and listening for jobs");
