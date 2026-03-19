import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";

/**
 * BUG-10 FIX: Source of truth for AI provider is tenant_settings.
 */
async function getAIProvider(tenantId: string) {
    const settings = await (prisma as any).tenant_settings.findUnique({
        where: { tenant_id: tenantId },
        select: { ai_provider: true }
    });
    return settings?.ai_provider || process.env.AI_PROVIDER || "openai";
}

async function getAPIKey(tenantId: string, provider: string) {
    const secrets = await (prisma as any).tenant_secrets.findMany({
        where: { tenant_id: tenantId, key: { in: ["openai_api_key", "gemini_api_key"] } }
    });
    
    const keyMap = secrets.reduce((acc: any, s: any) => {
        acc[s.key] = decrypt(s.encrypted_value);
        return acc;
    }, {});

    if (provider === "openai") return keyMap.openai_api_key || process.env.OPENAI_API_KEY;
    if (provider === "gemini") return keyMap.gemini_api_key || process.env.GEMINI_API_KEY;
    return null;
}

/**
 * Generates a vector embedding for a given text.
 */
export async function generateEmbedding(text: string, tenantId: string): Promise<number[]> {
    const provider = await getAIProvider(tenantId);
    const apiKey = await getAPIKey(tenantId, provider);

    if (!apiKey) throw new Error(`API Key for ${provider} not found for tenant ${tenantId}`);

    if (provider === "gemini") {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } else {
        const openai = new OpenAI({ apiKey });
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });
        return response.data[0].embedding;
    }
}

/**
 * Simple Cosine Similarity Function
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Searches for relevant document chunks in the database for a given tenant.
 */
export async function searchKnowledgeBase(query: string, tenantId: string, limit: number = 3) {
    const queryEmbedding = await generateEmbedding(query, tenantId);

    // Fetch all active chunks for this tenant
    // Note: In high-scale, this should be replaced by pgvector or a specialized vector DB.
    // For now, we do a simple linear scan + cosine similarity in JS.
    const documents = await (prisma as any).documents.findMany({
        where: { tenant_id: tenantId, status: "active" },
        include: { chunks: true }
    });

    const results: any[] = [];

    for (const doc of documents) {
        for (const chunk of doc.chunks) {
            if (!chunk.embedding) continue;
            
            const chunkEmbedding = chunk.embedding as number[];
            const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
            
            results.push({
                content: chunk.content,
                score,
                documentTitle: doc.title,
                metadata: chunk.metadata,
                documentId: doc.id
            });
        }
    }

    // Sort by descending score
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Simple text splitter that breaks content into chunks with overlap.
 */
export function splitText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.substring(start, end));
        start += (chunkSize - overlap);
        if (start < 0) break; // Safety break
    }

    return chunks;
}
