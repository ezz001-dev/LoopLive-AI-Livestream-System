import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { logAudit } from "@/lib/audit";
import { getAuthSession } from "@/lib/auth-session";
import { encrypt, decrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const SENSITIVE_KEYS = ["openai_api_key", "gemini_api_key", "yt_cookie"];

export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();

    // 1. Fetch non-sensitive settings
    let tenantSettings = await (prisma as any).tenant_settings.findUnique({
      where: { tenant_id: tenantId },
    });

    if (!tenantSettings) {
      // Create empty settings for tenant if missing
      tenantSettings = await (prisma as any).tenant_settings.create({
        data: { tenant_id: tenantId },
      });
    }

    // 2. Fetch sensitive secrets
    const secrets = await (prisma as any).tenant_secrets.findMany({
      where: { tenant_id: tenantId },
    });

    // 3. Merge for frontend compatibility
    // We decrypt only to check if value exists, but return masked values for security in GET
    const secretMap = secrets.reduce((acc: any, s: any) => {
      const decrypted = decrypt(s.encrypted_value);
      if (decrypted) {
        // Mask: keep last 4 characters, or just return placeholder if set
        acc[s.key] = decrypted.length > 8 
          ? `****${decrypted.slice(-4)}` 
          : "********";
      }
      return acc;
    }, {});

    // 4. Fetch global infra settings (fallback/bridge)
    const globalSettings = await prisma.system_settings.findUnique({
      where: { id: "1" },
    });

    const combinedSettings = {
      ...globalSettings,
      ...tenantSettings,
      ...secretMap,
    };

    return NextResponse.json(combinedSettings);
  } catch (error: any) {
    console.error("[Settings API] GET Error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const tenantId = await getCurrentTenantId();
    const body = await request.json();

    const settingsUpdate: any = {};
    const secretsUpdate: { key: string; value: string }[] = [];

    // Whitelist and split fields
    const allowedSettingsFields = [
      "ai_provider",
      "tts_provider",
      "yt_channel_handle",
      "tiktok_channel_handle",
      "ai_name",
      "ai_persona",
      "ai_tone_default",
      "max_response_length",
      "storage_provider",
      "r2_public_url",
      "r2_signed_reads",
      "r2_signed_read_ttl_seconds",
      "default_loop_mode",
      "use_client_side_ai",
    ];

    for (const key of allowedSettingsFields) {
      if (body[key] !== undefined) {
        settingsUpdate[key] = body[key];
      }
    }

    for (const key of SENSITIVE_KEYS) {
      if (body[key] !== undefined) {
        secretsUpdate.push({ key, value: body[key] });
      }
    }

    // 1. Update/Upsert Tenant Settings
    await (prisma as any).tenant_settings.upsert({
      where: { tenant_id: tenantId },
      update: settingsUpdate,
      create: {
        tenant_id: tenantId,
        ...settingsUpdate,
      },
    });

    // 2. Update/Upsert Tenant Secrets
    for (const secret of secretsUpdate) {
      // If the incoming value is masked (contains **** or is placeholder), skip update
      if (secret.value.includes("****") || secret.value === "********") continue;

      const encrypted = encrypt(secret.value);

      await (prisma as any).tenant_secrets.upsert({
        where: {
          tenant_id_key: {
            tenant_id: tenantId,
            key: secret.key,
          },
        },
        update: { encrypted_value: encrypted },
        create: {
          tenant_id: tenantId,
          key: secret.key,
          encrypted_value: encrypted,
        },
      });
    }

    // 3. Sync back to global if needed (for legacy workers), but we'll skip for now
    // as we have updated the primary workers to be tenant-aware.

    // --- Audit Log ---
    const authSession = await getAuthSession();
    await logAudit({
      tenantId,
      actorUserId: authSession?.userId,
      actorType: "user",
      action: "UPDATE_SETTINGS",
      targetType: "tenant_settings",
      targetId: tenantId,
      metadata: {
        fieldsUpdated: Object.keys(settingsUpdate),
        secretsUpdated: secretsUpdate.map(s => s.key)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Settings API] PATCH Error:", error.message);
    return NextResponse.json(
      { error: `Failed to update settings: ${error.message}` },
      { status: 500 }
    );
  }
}
