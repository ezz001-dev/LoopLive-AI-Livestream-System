import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { authenticateWithBridge } from "@/lib/auth-bridge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_dev_key_123");

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await authenticateWithBridge(email, password);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.tenantStatus === "suspended" && !user.canAccessOps) {
      return NextResponse.json(
        { error: "Workspace Anda sedang disuspend. Hubungi tim support untuk mengaktifkannya kembali." },
        { status: 403 }
      );
    }

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      authSource: user.authSource,
      tenantId: user.tenantId,
      tenantRole: user.tenantRole,
      tenantStatus: user.tenantStatus,
      appRole: user.appRole,
      canAccessOps: user.canAccessOps,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Increased to 7 days for convenience
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      redirectTo: user.canAccessOps ? "/ops" : "/admin",
    });
    
    // Set HTTP-only cookie
    // 'secure: true' ensures the cookie is only sent over HTTPS in production.
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.log(`[Security] Login success for ${email} via ${user.authSource}, token cookie set.`);

    return response;
  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
