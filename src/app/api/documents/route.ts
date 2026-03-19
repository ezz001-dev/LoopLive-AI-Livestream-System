import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { generateEmbedding, splitText } from "@/lib/vector-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents
 * List all Knowledge Base documents for the current tenant.
 */
export async function GET() {
    try {
        const tenantId = await getCurrentTenantId();
        const documents = await (prisma as any).documents.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: "desc" },
            include: {
                _count: {
                    select: { chunks: true }
                }
            }
        });

        return NextResponse.json(documents);
    } catch (error: any) {
        console.error("[API][Documents] GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/documents
 * Upload a new Knowledge Base document (Plain text for now).
 * Performs splitting and embedding generation synchronously for small docs.
 */
export async function POST(req: NextRequest) {
    try {
        const tenantId = await getCurrentTenantId();
        const { title, content } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        // 1. Create the Document record
        const document = await (prisma as any).documents.create({
            data: {
                tenant_id: tenantId,
                title,
                content, // Store full text
                status: "active",
                file_type: "txt"
            }
        });

        // 2. Split into chunks
        const chunks = splitText(content, 1000, 200);
        console.log(`[API][Documents] Splitting "${title}" into ${chunks.length} chunks...`);

        // 3. Generate embeddings for each chunk
        // For production, this should be moved to a background worker to avoid API timeout.
        const chunkPromises = chunks.map(async (chunkContent, index) => {
            try {
                const embedding = await generateEmbedding(chunkContent, tenantId);
                return (prisma as any).document_chunks.create({
                    data: {
                        document_id: document.id,
                        content: chunkContent,
                        embedding: embedding,
                        metadata: { index }
                    }
                });
            } catch (err: any) {
                console.error(`[API][Documents] Error generating embedding for chunk ${index}:`, err.message);
                return null;
            }
        });

        await Promise.all(chunkPromises);

        return NextResponse.json({
            message: "Document uploaded and indexed successfully",
            documentId: document.id,
            chunks: chunks.length
        });

    } catch (error: any) {
        console.error("[API][Documents] POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
