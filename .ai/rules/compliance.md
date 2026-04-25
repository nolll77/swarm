# Governance: Compliance & Data Privacy Rules

## CP-001: PII Protection
No PII (Personal Identifiable Information) shall be stored in plain text. This includes but is not limited to:
- Full Names
- Email Addresses
- Physical Addresses
- IP Addresses (when linked to a user)

**Enforcement:** The GDPR Agent will block any PR containing unencrypted PII.

## CP-002: Right to be Forgotten
Every data entity linked to a tenant or user must support soft deletion and permanent scrubbing.
- Requirement: `deletedAt` field in all user-related tables.
- Requirement: Cleanup worker must be configured for the tenant's retention period.

## CP-003: Multi-tenant Data Leakage
Cross-tenant data access is a critical security failure.
- Requirement: Every query must include a `where: { tenantId }` clause.
- Requirement: Database row-level security must be active.

## CP-004: Auditability
All modifications to sensitive data must generate an entry in the `AuditLog` table.
- Requirement: `actorId`, `action`, `originalValue`, `newValue`.

## CP-005: Sovereign Data Residency
Tenants with "Sovereign" tier must have their data stored in their designated AWS region.
- Requirement: Partitioning by Region at the infrastructure layer (Terraform).
