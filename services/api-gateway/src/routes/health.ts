import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "api-gateway",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

router.get("/ready", (_req: Request, res: Response) => {
  res.json({ ready: true });
});

export { router as healthRouter };
