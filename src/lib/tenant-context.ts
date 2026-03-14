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

  if (cachedTenantContext) {
    return cachedTenantContext;
  }

  const tenant =
    (await (prisma as any).tenants.findUnique({
      where: { slug: DEFAULT_TENANT_SLUG },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })) ||
    (await (prisma as any).tenants.findFirst({
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    }));

  if (!tenant) {
    throw new Error(
      "No tenant context found. Run the SaaS foundation backfill first so the default tenant is available."
    );
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
  options?: Record<string, unknown>
) {
  const tenantId = await getCurrentTenantId();

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
  options?: Record<string, unknown>
) {
  const tenantId = await getCurrentTenantId();

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
