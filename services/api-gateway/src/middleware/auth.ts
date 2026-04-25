import { Request, Response, NextFunction } from "express";
import { createLogger } from "@ai-dev/logger";
import prisma from "@ai-dev/database";

const logger = createLogger("auth-middleware");

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid authorization format. Use: Bearer <api_key>" });
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token },
      include: { tenant: true },
    });

    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({ error: "Invalid or inactive API key" });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    (req as any).tenantId = apiKey.tenantId;
    (req as any).tenant = apiKey.tenant;

    logger.debug("Authenticated request", { tenantId: apiKey.tenantId });
    next();
  } catch (err) {
    logger.error("Auth middleware error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: "Internal authentication error" });
  }
}
