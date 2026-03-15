import { prisma } from "./prisma";

export type AuditActorType = "system" | "user" | "internal_ops";

/**
 * Log an audit entry for a tenant action.
 */
export async function logAudit(params: {
  tenantId?: string;
  actorUserId?: string;
  actorType: AuditActorType;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: any;
}) {
  try {
    return await (prisma as any).audit_logs.create({
      data: {
        tenant_id: params.tenantId,
        actor_user_id: params.actorUserId,
        actor_type: params.actorType,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId,
        metadata: params.metadata || {},
      },
    });
  } catch (error: any) {
    console.error(`[Audit] Failed to log action ${params.action}:`, error.message);
  }
}
