import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_dev_key_123"
);

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: string;
  authSource: string;
  tenantId?: string;
  tenantRole?: string;
  tenantStatus?: string;
  appRole?: string;
  canAccessOps?: boolean;
};

export async function getAuthSession(): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    return {
      userId: String(payload.userId || ""),
      email: String(payload.email || ""),
      role: String(payload.role || ""),
      authSource: String(payload.authSource || ""),
      tenantId: payload.tenantId ? String(payload.tenantId) : undefined,
      tenantRole: payload.tenantRole ? String(payload.tenantRole) : undefined,
      tenantStatus: payload.tenantStatus ? String(payload.tenantStatus) : undefined,
      appRole: payload.appRole ? String(payload.appRole) : undefined,
      canAccessOps: Boolean(payload.canAccessOps),
    };
  } catch {
    return null;
  }
}

export async function requireInternalOpsSession() {
  const session = await getAuthSession();

  if (!session || !session.canAccessOps) {
    return null;
  }

  return session;
}
