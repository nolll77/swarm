import rateLimit from "express-rate-limit";

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).tenantId || req.ip || "unknown";
  },
  message: {
    error: "Too many requests. Please try again later.",
  },
});
