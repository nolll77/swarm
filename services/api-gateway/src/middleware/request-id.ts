import { Request, Response, NextFunction } from "express";
import { generateId } from "@ai-dev/shared";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers["x-request-id"] as string) || generateId();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
