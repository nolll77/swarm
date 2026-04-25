import { Request, Response, NextFunction } from "express";
import { createLogger } from "@ai-dev/logger";

const logger = createLogger("error-handler");

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: "Internal server error",
    requestId: (req as any).requestId,
  });
}
