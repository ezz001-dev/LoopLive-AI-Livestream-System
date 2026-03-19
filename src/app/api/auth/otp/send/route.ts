import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 0. Rate Limiting: Max 3 requests per 10 minutes
    const limit = await rateLimit(`${ip}:${email}`, {
      windowSeconds: 600, // 10 minutes
      maxRequests: 3,
      keyPrefix: "otp-send",
    });

    if (!limit.success) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please try again in 10 minutes.",
          remaining: limit.remaining,
          reset: limit.reset
        }, 
        { 
          status: 429,
          headers: {
            "Retry-After": limit.reset.toString()
          }
        }
      );
    }

    // 1. Check if user already exists
    const existingUser = await (prisma as any).users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // 2. Generate and store OTP
    const otp = generateOTP();
    await storeOTP(email, otp);

    // 3. Send Email
    await sendOTPEmail(email, otp);

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("[OTP-Send] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
