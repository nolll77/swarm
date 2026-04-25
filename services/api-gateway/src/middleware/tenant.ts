import { Request, Response, NextFunction } from "express";

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = (req as any).tenantId;

  if (!tenantId) {
    return res.status(403).json({ error: "Tenant context not resolved" });
  }

  // Attach tenant context to all downstream handlers
  res.locals.tenantId = tenantId;
  res.locals.tenant = (req as any).tenant;

  next();
}
