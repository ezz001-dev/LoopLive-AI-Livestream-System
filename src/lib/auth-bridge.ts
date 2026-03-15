import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { canAccessInternalOps } from "@/lib/internal-ops";

export type AuthBridgeUser = {
  id: string;
  email: string;
  role: "admin";
  authSource: "users" | "admin_users";
  tenantId: string;
  tenantRole: string;
  tenantStatus: string;
  appRole: "tenant_admin" | "internal_ops";
  canAccessOps: boolean;
};

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function getDefaultDisplayName(email: string) {
  return email.split("@")[0] || "User";
}

async function getOrCreateDefaultTenant() {
  const defaultTenantSlug = process.env.SAAS_DEFAULT_TENANT_SLUG || "default-workspace";

  const existingTenant = await (prisma as any).tenants.findUnique({
    where: { slug: defaultTenantSlug },
  });

  if (existingTenant) {
    return existingTenant;
  }

  return (prisma as any).tenants.create({
    data: {
      name: "Default Workspace",
      slug: defaultTenantSlug,
      status: "active",
    },
  });
}

async function ensureTenantMembership(userId: string) {
  const defaultTenant = await getOrCreateDefaultTenant();

  const existingMembership = await (prisma as any).tenant_users.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: "asc" },
  });

  if (existingMembership) {
    const existingTenant = await (prisma as any).tenants.findUnique({
      where: { id: existingMembership.tenant_id },
      select: { id: true, status: true },
    });

    return {
      tenantId: existingMembership.tenant_id,
      tenantRole: existingMembership.role || "owner",
      tenantStatus: existingTenant?.status || "active",
    };
  }

  const newMembership = await (prisma as any).tenant_users.create({
    data: {
      tenant_id: defaultTenant.id,
      user_id: userId,
      role: "owner",
    },
  });

  return {
    tenantId: newMembership.tenant_id,
    tenantRole: newMembership.role,
    tenantStatus: defaultTenant.status || "active",
  };
}

async function syncLegacyAdminToUsers(legacyAdmin: { email: string; password: string }) {
  const existingUser = await (prisma as any).users.findUnique({
    where: { email: legacyAdmin.email },
  });

  if (existingUser) {
    return existingUser;
  }

  return (prisma as any).users.create({
    data: {
      email: legacyAdmin.email,
      password_hash: legacyAdmin.password,
      display_name: getDefaultDisplayName(legacyAdmin.email),
      status: "active",
    },
  });
}

export async function authenticateWithBridge(email: string, password: string): Promise<AuthBridgeUser | null> {
  const hashedPassword = hashPassword(password);
  const isInternalOps = canAccessInternalOps(email);

  const tenantFacingUser = await (prisma as any).users.findUnique({
    where: { email },
  });

  if (tenantFacingUser && tenantFacingUser.password_hash === hashedPassword) {
    const membership = await ensureTenantMembership(tenantFacingUser.id);
    return {
      id: tenantFacingUser.id,
      email: tenantFacingUser.email,
      role: "admin",
      authSource: "users",
      tenantId: membership.tenantId,
      tenantRole: membership.tenantRole,
      tenantStatus: membership.tenantStatus,
      appRole: isInternalOps ? "internal_ops" : "tenant_admin",
      canAccessOps: isInternalOps,
    };
  }

  let legacyAdmin = await prisma.admin_users.findUnique({ where: { email } });

  // Keep legacy MVP bootstrap while auth bridge is still in transition.
  if (!legacyAdmin && email === "admin@looplive.ai" && password === "admin123") {
    legacyAdmin = await prisma.admin_users.create({
      data: { email, password: hashedPassword },
    });
  }

  if (!legacyAdmin || legacyAdmin.password !== hashedPassword) {
    return null;
  }

  const bridgedUser = await syncLegacyAdminToUsers(legacyAdmin);
  const membership = await ensureTenantMembership(bridgedUser.id);

  return {
    id: bridgedUser.id,
    email: bridgedUser.email,
    role: "admin",
    authSource: "admin_users",
    tenantId: membership.tenantId,
    tenantRole: membership.tenantRole,
    tenantStatus: membership.tenantStatus,
    appRole: isInternalOps ? "internal_ops" : "tenant_admin",
    canAccessOps: isInternalOps,
  };
}
