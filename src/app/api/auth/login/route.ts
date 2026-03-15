import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { authenticateWithBridge } from "@/lib/auth-bridge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_dev_key_123");

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await authenticateWithBridge(email, password);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      authSource: user.authSource,
      tenantId: user.tenantId,
      tenantRole: user.tenantRole,
      appRole: user.appRole,
      canAccessOps: user.canAccessOps,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Increased to 7 days for convenience
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true });
    
    // Set HTTP-only cookie
    // Note: 'secure' is false for now to support non-SSL VPS setups. 
    // In production with SSL, this should be true.
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: false, // Changed from production check to false for easier VPS setup
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
