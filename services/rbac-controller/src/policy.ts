export type Role = "admin" | "developer" | "viewer" | "system";

export type Permission = 
  // Deployments
  | "deploy:trigger"
  | "deploy:rollback"
  
  // Secrets
  | "secrets:read"
  | "secrets:write"
  | "secrets:rotate"
  
  // Tasks (AI Agents)
  | "tasks:create"
  | "tasks:approve" // e.g. approving a PR before it merges
  | "tasks:view"
  
  // Prompt Evolution
  | "prompts:mutate" // can force apply a prompt mutation
  
  // Billing
  | "billing:view"
  | "billing:manage";

/**
 * Role to Permission mapping
 * This defines the exact boundary of what each role can do within a tenant.
 */
export const ROLE_POLICIES: Record<Role, Permission[]> = {
  // System has total power, used by internal agents (SRE, Canary)
  system: [
    "deploy:trigger", "deploy:rollback", 
    "secrets:read", "secrets:write", "secrets:rotate",
    "tasks:create", "tasks:approve", "tasks:view",
    "prompts:mutate",
    "billing:view", "billing:manage"
  ],
  
  // Admin is the tenant owner
  admin: [
    "deploy:trigger", "deploy:rollback",
    "secrets:read", "secrets:write", "secrets:rotate",
    "tasks:create", "tasks:approve", "tasks:view",
    "prompts:mutate",
    "billing:view", "billing:manage"
  ],
  
  // Developer can manage code and tasks, but cannot touch secrets, billing, or prod deployments
  developer: [
    "tasks:create", "tasks:view",
    "secrets:read" // Only read-access to secrets allowed for their agents
  ],
  
  // Viewer can only observe the system state
  viewer: [
    "tasks:view",
    "billing:view"
  ]
};
