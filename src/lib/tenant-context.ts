import { prisma } from "@/lib/prisma";

const DEFAULT_TENANT_SLUG = process.env.SAAS_DEFAULT_TENANT_SLUG || "default-workspace";

type TenantContext = {
  id: string;
  slug: string;
  name: string;
};

let cachedTenantContext: TenantContext | null = null;

export async function getCurrentTenantContext(): Promise<TenantContext> {
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
