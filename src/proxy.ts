import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_dev_key_123");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define protected and public routes
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedApiRoute = pathname.startsWith("/api/live") || pathname.startsWith("/api/videos");
  const isYouTubeIdRoute = pathname.match(/\/api\/live\/[^\/]+\/youtube-id$/);

  // 1.5 IP Whitelisting (Optional Security for VPS)
  const allowedIpsStr = process.env.ALLOWED_IPS;
  // Handle empty or whitespace-only string as disabled
  if (allowedIpsStr && allowedIpsStr.trim().length > 0 && (isAdminRoute || isProtectedApiRoute || isAuthRoute)) {
    // Robust parsing: strip everything except digits, dots, and commas, then split
    const cleanStr = allowedIpsStr.replace(/[^\d.,]/g, '');
    const allowedIps = cleanStr.split(",").filter(ip => ip.length > 0);
    
    // Check multiple possible IP headers
    const clientIp = 
        request.headers.get("x-client-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        (request as any).ip || 
        "unknown";
    
    // Explicit server log for comparison
    console.error(`[Security] IP_CHECK: Client=[${clientIp}] Whitelist=[${allowedIps.join("|")}] Result=${allowedIps.includes(clientIp)}`);

    if (clientIp !== "127.0.0.1" && clientIp !== "::1" && !allowedIps.includes(clientIp)) {
      console.warn(`[Security] Blocked unauthorized IP: ${clientIp} attempted access to ${pathname}`);
      return new NextResponse(`Access Denied: Your IP (${clientIp}) is not whitelisted. Silakan tambahkan IP ini ke .env di bagian ALLOWED_IPS.`, { status: 403 });
    }
  }
  const token = request.cookies.get("auth_token")?.value;

  // 3. Handle Login/Auth routes (Redirect to admin if already logged in)
  if (isAuthRoute) {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/admin", request.url));
      } catch (e) {
        // Invalid token, allow access to login
      }
    }
    return NextResponse.next();
  }

  // 4. Handle Protected routes (Admin & Live APIs)
  if (isAdminRoute || isProtectedApiRoute) {
    // Allow internal scheduler requests with API key
    const schedulerKey = request.headers.get("x-scheduler-key");
    const expectedKey = process.env.SCHEDULER_API_KEY || "looplive-scheduler-internal-key";
    if (schedulerKey === expectedKey && (isProtectedApiRoute || isYouTubeIdRoute)) {
      return NextResponse.next();
    }

    if (!token) {
      if (isAdminRoute) {
        return NextResponse.redirect(new URL("/login", request.url));
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (e) {
      console.error("Middleware Auth Error:", e);
      if (isAdminRoute) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("auth_token");
        return response;
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/admin/:path*", "/api/live/:path*", "/api/videos/:path*", "/login"],
};
