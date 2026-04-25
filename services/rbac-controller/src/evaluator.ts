import { createLogger } from "@ai-dev/logger";
import { Role, Permission, ROLE_POLICIES } from "./policy";

const logger = createLogger("rbac-controller:evaluator");

export interface AccessRequest {
  userId: string;
  tenantId: string;
  resourceId?: string;
  requiredPermission: Permission;
}

export interface AccessResult {
  granted: boolean;
  reason: string;
}

/**
 * Access Evaluator
 * Validates whether a user has the right to perform an action.
 */
export class AccessEvaluator {
  
  /**
   * Mock Database Lookup.
   * In a real system, you would query Prisma: 
   * `prisma.user.findUnique({ where: { id: userId, tenantId } })`
   * to get the user's role.
   */
  private async getUserRole(userId: string, tenantId: string): Promise<Role | null> {
    // Hardcoded dev simulation for demonstration
    if (userId.startsWith("admin-")) return "admin";
    if (userId.startsWith("dev-")) return "developer";
    if (userId.startsWith("viewer-")) return "viewer";
    if (userId === "system") return "system";
    
    return null; // Unknown user
  }

  /**
   * Core Access Decision Logic
   */
  async evaluateAccess(request: AccessRequest): Promise<AccessResult> {
    const role = await this.getUserRole(request.userId, request.tenantId);
    
    // 1. Identity Check
    if (!role) {
      logger.warn("Access Denied: Unknown user or not in tenant", { userId: request.userId, tenantId: request.tenantId });
      return { granted: false, reason: "IDENTITY_UNKNOWN" };
    }

    // 2. Policy Check
    const allowedPermissions = ROLE_POLICIES[role];
    const hasPermission = allowedPermissions.includes(request.requiredPermission);

    if (!hasPermission) {
      logger.warn("Access Denied: Missing permission", { 
        userId: request.userId, 
        role, 
        required: request.requiredPermission 
      });
      return { granted: false, reason: "PERMISSION_DENIED" };
    }

    // 3. Grant Access
    logger.debug("Access Granted", { userId: request.userId, role, permission: request.requiredPermission });
    return { granted: true, reason: "ACCESS_GRANTED" };
  }
}
