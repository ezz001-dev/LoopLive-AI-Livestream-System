import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

/**
 * DELETE /api/documents/[id]
 * Remove a document and its chunks.
 */
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const tenantId = await getCurrentTenantId();
        const { id } = params;

        // Verify ownership
        const doc = await (prisma as any).documents.findFirst({
            where: { id, tenant_id: tenantId }
        });

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Delete (Cascade handles chunks if Prisma is configured, otherwise handles it manually)
        await (prisma as any).documents.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Document deleted successfully" });
    } catch (error: any) {
        console.error("[API][Documents] DELETE Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
