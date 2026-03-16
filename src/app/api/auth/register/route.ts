import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-bridge";
import { verifyOTP } from "@/lib/otp";

export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_dev_key_123");

export async function POST(req: Request) {
    try {
        const { email, password, name, workspaceName, otp } = await req.json();

        if (!email || !password || !name || !workspaceName || !otp) {
            return NextResponse.json({ error: "All fields and OTP are required" }, { status: 400 });
        }

        // 0. Verify OTP
        const isOtpValid = await verifyOTP(email, otp);
        if (!isOtpValid) {
            return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
        }

        // Check global registration limit
        try {
            const settings = await (prisma as any).system_settings.findFirst();
            if (settings && settings.registration_limit > 0) {
                const tenantCount = await (prisma as any).tenants.count();
                if (tenantCount >= settings.registration_limit) {
                    return NextResponse.json({ 
                        error: "Batas pendaftaran pengguna baru untuk periode pilot ini telah tercapai. Silakan hubungi tim LoopLive untuk mendapatkan akses." 
                    }, { status: 403 });
                }
            }
        } catch (err) {
            console.error("Failed to check registration limit", err);
        }

        // 1. Check if user exists
        const existingUser = await (prisma as any).users.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "Email already registered" }, { status: 400 });
        }

        // 2. Atomic creation of User, Tenant, and Membership
        const result = await prisma.$transaction(async (tx: any) => {
            // Create User
            const user = await tx.users.create({
                data: {
                    email,
                    password_hash: hashPassword(password),
                    display_name: name,
                    status: "active",
                }
            });

            // Create Tenant
            const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.random().toString(36).substring(2, 7);
            const tenant = await tx.tenants.create({
                data: {
                    name: workspaceName,
                    slug: slug,
                    status: "active",
                }
            });

            // Link User to Tenant as Owner
            await tx.tenant_users.create({
                data: {
                    tenant_id: tenant.id,
                    user_id: user.id,
                    role: "owner",
                }
            });

            // Initialize Tenant Settings
            await tx.tenant_settings.create({
                data: {
                    tenant_id: tenant.id,
                    ai_provider: "openai",
                    tts_provider: "openai",
                    storage_provider: "local",
                }
            });

            // Initialize Trial Subscription
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14); // 14 days trial

            await tx.subscriptions.create({
                data: {
                    tenant_id: tenant.id,
                    plan_code: "free_trial",
                    status: "trialing",
                    trial_ends_at: trialEnd,
                    current_period_end: trialEnd,
                }
            });

            // 4. Check for pending invitations
            const pendingInvites = await tx.invitations.findMany({
                where: { email, status: "pending" }
            });

            for (const invite of pendingInvites) {
                await tx.tenant_users.create({
                    data: {
                        tenant_id: invite.tenant_id,
                        user_id: user.id,
                        role: invite.role,
                    }
                });

                await tx.invitations.update({
                    where: { id: invite.id },
                    data: { status: "accepted" }
                });
            }

            return { user, tenant };
        });

        // 3. Generate Token for auto-login
        const token = await new SignJWT({
            userId: result.user.id,
            email: result.user.email,
            role: "admin",
            authSource: "users",
            tenantId: result.tenant.id,
            tenantRole: "owner",
            tenantStatus: "active",
            appRole: "tenant_admin",
            canAccessOps: false,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(JWT_SECRET);

        const response = NextResponse.json({
            success: true,
            redirectTo: "/onboarding",
        });

        response.cookies.set({
            name: "auth_token",
            value: token,
            httpOnly: true,
            secure: false, // development/vps non-ssl support
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        console.log(`[Auth] New registration: ${email}, Workspace: ${workspaceName}`);

        return response;

    } catch (error: any) {
        console.error("Registration Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
