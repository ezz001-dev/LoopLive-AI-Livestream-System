import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";

const DEFAULT_TENANT_SLUG = process.env.SAAS_DEFAULT_TENANT_SLUG || "default-workspace";

type TenantContext = {
  id: string;
  slug: string;
  name: string;
};

let cachedTenantContext: TenantContext | null = null;

export async function getCurrentTenantContext(): Promise<TenantContext> {
  // Safety check: verify if Prisma Client has been generated with tenant models
  if (!(prisma as any).tenants) {
    throw new Error(
      "Prisma Client is missing the 'tenants' model. Please stop the dev server and run 'npx prisma generate'."
    );
  }

  const authSession = await getAuthSession();
  if (authSession?.tenantId) {
    const tenantFromAuth = await (prisma as any).tenants.findUnique({
      where: { id: authSession.tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (tenantFromAuth) {
      return tenantFromAuth;
    }
  }

  if (!authSession?.tenantId) {
    throw new Error("Unauthorized: No tenant context found in session.");
  }

  const tenant = await (prisma as any).tenants.findUnique({
    where: { id: authSession.tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found or inactive.");
  }

  cachedTenantContext = tenant;
  return tenant;
}

export async function getCurrentTenantId() {
  const tenant = await getCurrentTenantContext();
  return tenant.id;
}

export async function getTenantScopedLiveSession(
  liveSessionId: string,
  options?: Record<string, unknown>,
  tenantIdOverride?: string
) {
  const tenantId = tenantIdOverride || await getCurrentTenantId();

  return (prisma.live_sessions as any).findFirst({
    where: {
      id: liveSessionId,
      tenant_id: tenantId,
    },
    ...(options || {}),
  });
}

export async function getTenantScopedVideo(
  videoId: string,
  options?: Record<string, unknown>,
  tenantIdOverride?: string
) {
  const tenantId = tenantIdOverride || await getCurrentTenantId();

  return (prisma.videos as any).findFirst({
    where: {
      id: videoId,
      tenant_id: tenantId,
    },
    ...(options || {}),
  });
}

export async function getLiveSessionTenantId(liveSessionId: string) {
  const session = await (prisma.live_sessions as any).findUnique({
    where: { id: liveSessionId },
    select: { tenant_id: true },
  });

  return session?.tenant_id || null;
}
