import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_dev_key_123");
const DEFAULT_INTERNAL_ACCESS_MODE = "disabled";

function isProtectedPath(pathname: string) {
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isOpsRoute = pathname.startsWith("/ops");
  const isSuspendedRoute = pathname.startsWith("/suspended");
  const isProtectedApiRoute =
    pathname.startsWith("/api/live") ||
    pathname.startsWith("/api/videos") ||
    pathname.startsWith("/api/ops");
  const isYouTubeIdRoute = pathname.match(/\/api\/live\/[^\/]+\/youtube-id$/);

  return { isAuthRoute, isAdminRoute, isOpsRoute, isSuspendedRoute, isProtectedApiRoute, isYouTubeIdRoute };
}

async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload;
}

function getInternalAccessMode() {
  const mode = process.env.INTERNAL_ACCESS_MODE?.trim().toLowerCase();
  if (
    mode === "disabled" ||
    mode === "ip_whitelist" ||
    mode === "tailscale" ||
    mode === "proxy_header"
  ) {
    return mode;
  }

  return DEFAULT_INTERNAL_ACCESS_MODE;
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-client-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    (request as any).ip ||
    "unknown"
  );
}

function isLoopbackIp(ip: string) {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function normalizeIpv4(ip: string) {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function isPrivateOrTailscaleIp(ip: string) {
  const normalized = normalizeIpv4(ip);
  if (isLoopbackIp(normalized)) return true;

  const parts = normalized.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // Tailscale / CGNAT range

  return false;
}

function parseAllowedIps(rawValue: string | undefined) {
  if (!rawValue?.trim()) return [];
  const cleanStr = rawValue.replace(/[^\d.,:]/g, "");
  return cleanStr.split(",").map((value) => value.trim()).filter((value) => value.length > 0);
}

function isIpAllowed(clientIp: string, allowedIps: string[]) {
  const normalizedClientIp = normalizeIpv4(clientIp);
  return allowedIps.some((allowedIp) => normalizeIpv4(allowedIp) === normalizedClientIp);
}

function hasTrustedProxyHeader(request: NextRequest) {
  const headerName = process.env.INTERNAL_AUTH_PROXY_HEADER?.trim().toLowerCase();
  const expectedValue = process.env.INTERNAL_AUTH_PROXY_VALUE?.trim();

  if (!headerName) {
    return false;
  }

  const actualValue = request.headers.get(headerName);
  if (!actualValue) {
    return false;
  }

  if (!expectedValue) {
    return true;
  }

  return actualValue.trim() === expectedValue;
}

function enforceInternalAccess(request: NextRequest, pathname: string) {
  const mode = getInternalAccessMode();
  if (mode === "disabled") {
    return null;
  }

  const clientIp = getClientIp(request);

  if (mode === "ip_whitelist") {
    const allowedIps = parseAllowedIps(process.env.ALLOWED_IPS);
    console.error(
      `[Security] IP_CHECK: Mode=ip_whitelist Client=[${clientIp}] Whitelist=[${allowedIps.join("|")}] Result=${isIpAllowed(clientIp, allowedIps)}`
    );

    if (!isLoopbackIp(clientIp) && !isIpAllowed(clientIp, allowedIps)) {
      return new NextResponse(
        `Access Denied: Your IP (${clientIp}) is not whitelisted. Tambahkan IP ini ke ALLOWED_IPS atau pindah ke INTERNAL_ACCESS_MODE=tailscale/proxy_header.`,
        { status: 403 }
      );
    }

    return null;
  }

  if (mode === "tailscale") {
    const allowed = isPrivateOrTailscaleIp(clientIp);
    console.error(`[Security] IP_CHECK: Mode=tailscale Client=[${clientIp}] Result=${allowed}`);

    if (!allowed) {
      return new NextResponse(
        `Access Denied: Mode tailscale hanya menerima IP private/Tailscale. Client IP terdeteksi: ${clientIp}.`,
        { status: 403 }
      );
    }

    return null;
  }

  if (mode === "proxy_header") {
    const allowed = hasTrustedProxyHeader(request);
    console.error(`[Security] PROXY_HEADER_CHECK: Client=[${clientIp}] Result=${allowed}`);

    if (!allowed) {
      return new NextResponse(
        "Access Denied: Request tidak membawa trusted proxy header yang diwajibkan untuk mode proxy_header.",
        { status: 403 }
      );
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define protected and public routes
  const { isAuthRoute, isAdminRoute, isOpsRoute, isSuspendedRoute, isProtectedApiRoute, isYouTubeIdRoute } = isProtectedPath(pathname);

  if (isAdminRoute || isOpsRoute || isProtectedApiRoute || isAuthRoute) {
    const internalAccessResponse = enforceInternalAccess(request, pathname);
    if (internalAccessResponse) {
      console.warn(`[Security] Blocked internal access for ${pathname}`);
      return internalAccessResponse;
    }
  }

  const token = request.cookies.get("auth_token")?.value;

  // 3. Handle Login/Auth routes (Redirect to admin if already logged in)
  if (isAuthRoute) {
    if (token) {
      try {
        const payload = await verifyAuthToken(token);
        if (payload.tenantStatus === "suspended" && !payload.canAccessOps) {
          return NextResponse.redirect(new URL("/suspended", request.url));
        }
        return NextResponse.redirect(new URL(payload.canAccessOps ? "/ops" : "/admin", request.url));
      } catch (e) {
        console.error("[Security] Token invalid on login page, allowing stay");
        // Invalid token, allow access to login
      }
    }
    return NextResponse.next();
  }

  if (isSuspendedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const payload = await verifyAuthToken(token);
      if (payload.tenantStatus === "suspended" && !payload.canAccessOps) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL(payload.canAccessOps ? "/ops" : "/admin", request.url));
    } catch {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth_token");
      return response;
    }
  }

  // 4. Handle Protected routes (Admin & Live APIs)
  if (isAdminRoute || isOpsRoute || isProtectedApiRoute) {
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
      const payload = await verifyAuthToken(token);

      if (isOpsRoute && !payload.canAccessOps) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      if (payload.tenantStatus === "suspended" && !payload.canAccessOps) {
        if (isAdminRoute) {
          return NextResponse.redirect(new URL("/suspended", request.url));
        }

        if (isProtectedApiRoute && !pathname.startsWith("/api/ops")) {
          return NextResponse.json(
            { error: "Workspace suspended" },
            { status: 423 }
          );
        }
      }

      return NextResponse.next();
    } catch (e: any) {
      console.error(`[Security] Middleware Auth Error: ${e?.message || "Invalid Token"}`);
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
  matcher: ["/admin/:path*", "/ops/:path*", "/api/live/:path*", "/api/videos/:path*", "/api/ops/:path*", "/login", "/suspended"],
};
