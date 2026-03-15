import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalOpsSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireInternalOpsSession();

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const nextStatus = body?.status === "suspended" ? "suspended" : "active";

    const tenant = await (prisma as any).tenants.findUnique({
      where: { id },
      select: { id: true, status: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const updatedTenant = await (prisma as any).tenants.update({
      where: { id: tenant.id },
      data: { status: nextStatus },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: updatedTenant,
    });
  } catch (error: any) {
    console.error("[Ops API] Tenant status update failed:", error.message);
    return NextResponse.json({ error: "Failed to update tenant status" }, { status: 500 });
  }
}
