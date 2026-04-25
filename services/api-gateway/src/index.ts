import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createLogger } from "@ai-dev/logger";
import { webhookRouter } from "./routes/webhooks";
import { tenantRouter } from "./routes/tenants";
import { taskRouter } from "./routes/tasks";
import { metricsRouter } from "./routes/metrics";
import { healthRouter } from "./routes/health";
import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { requestIdMiddleware } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";

dotenv.config();

const logger = createLogger("api-gateway");
const app = express();

// --- Global Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(requestIdMiddleware);

// --- Public Routes ---
app.use("/health", healthRouter);
app.use("/webhooks", webhookRouter);

// --- Protected Routes ---
app.use("/api/v1", authMiddleware);
app.use("/api/v1", tenantMiddleware);
app.use("/api/v1", rateLimitMiddleware);
app.use("/api/v1/tenants", tenantRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/metrics", metricsRouter);

// --- Error Handler ---
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info("API Gateway started", { port });
});

export default app;
