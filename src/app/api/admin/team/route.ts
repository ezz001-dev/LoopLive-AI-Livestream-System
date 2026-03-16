import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";
import { getTenantLimits } from "@/lib/limits";

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [members, pendingInvitations] = await Promise.all([
            (prisma as any).tenant_users.findMany({
                where: { tenant_id: session.tenantId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            display_name: true,
                            status: true
                        }
                    }
                },
                orderBy: { created_at: "asc" }
            }),
            (prisma as any).invitations.findMany({
                where: { tenant_id: session.tenantId, status: "pending" },
                orderBy: { created_at: "desc" }
            })
        ]);

        const limits = await getTenantLimits(session.tenantId);

        return NextResponse.json({
            members,
            pendingInvitations,
            limits: {
                max: limits.maxTeamMembers,
                current: members.length + pendingInvitations.length
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email, role = "member" } = await req.json();
        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // 1. Check limits (count both members and pending invites)
        const [membersCount, pendingCount, limits] = await Promise.all([
            (prisma as any).tenant_users.count({ where: { tenant_id: session.tenantId } }),
            (prisma as any).invitations.count({ where: { tenant_id: session.tenantId, status: "pending" } }),
            getTenantLimits(session.tenantId)
        ]);

        if (membersCount + pendingCount >= limits.maxTeamMembers) {
            return NextResponse.json({ 
                error: `Batas anggota tim untuk paket ${limits.planName} telah tercapai (${limits.maxTeamMembers}). Silakan upgrade paket Anda.` 
            }, { status: 403 });
        }

        // 2. Find user by email
        const user = await (prisma as any).users.findUnique({ where: { email } });
        
        if (!user) {
            // Scenario 2: Create a pending invitation
            const existingInvite = await (prisma as any).invitations.findFirst({
                where: { tenant_id: session.tenantId, email, status: "pending" }
            });

            if (existingInvite) {
                return NextResponse.json({ error: "Undangan sudah terkirim ke email ini." }, { status: 400 });
            }

            const invitation = await (prisma as any).invitations.create({
                data: {
                    tenant_id: session.tenantId,
                    email,
                    role,
                    status: "pending"
                }
            });

            return NextResponse.json({ invitation, pending: true });
        }

        // 3. User exists -> Check if already a member
        const existingMember = await (prisma as any).tenant_users.findUnique({
            where: {
                tenant_id_user_id: {
                    tenant_id: session.tenantId,
                    user_id: user.id
                }
            }
        });

        if (existingMember) {
            return NextResponse.json({ error: "User tersebut sudah menjadi anggota tim Anda." }, { status: 400 });
        }

        // 4. Add to tenant
        const newMember = await (prisma as any).tenant_users.create({
            data: {
                tenant_id: session.tenantId,
                user_id: user.id,
                role: role
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        display_name: true
                    }
                }
            }
        });

        return NextResponse.json(newMember);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
