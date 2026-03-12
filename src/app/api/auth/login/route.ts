import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_dev_key_123");

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Hash password for comparison (MVP simple SHA256)
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    let user = await prisma.admin_users.findUnique({ where: { email } });
    
    // Auto-create MVP admin if not exist 
    if (!user && email === "admin@looplive.ai" && password === "admin123") {
        user = await prisma.admin_users.create({
            data: { email, password: hashedPassword }
        });
    }

    if (!user || user.password !== hashedPassword) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await new SignJWT({ userId: user.id, email: user.email, role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Increased to 7 days for convenience
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true });
    
    // Set HTTP-only cookie
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

