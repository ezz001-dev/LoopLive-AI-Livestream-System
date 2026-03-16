import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";
import { midtransSnap, generateOrderId } from "@/lib/midtrans";

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { planCode, period = "monthly" } = await request.json();
        
        // Fetch plan details from DB
        const plan = await (prisma as any).plans.findUnique({
            where: { code: planCode, active: true }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
        }

        // Determine price (assume IDR for now)
        let amount = Number(plan.price_idr);
        if (period === "yearly") {
            amount = amount * 10; // Simple yearly discount (10 months for 12)
        }

        const orderId = generateOrderId(session.tenantId);

        // Create a pending transaction
        await (prisma as any).transactions.create({
            data: {
                order_id: orderId,
                tenant_id: session.tenantId,
                plan_code: planCode,
                amount: amount,
                currency: "IDR",
                status: "pending",
                metadata: {
                    period,
                    userId: session.userId,
                    email: session.email
                }
            }
        });

        // Prepare Midtrans parameter
        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: amount,
            },
            customer_details: {
                first_name: session.email.split('@')[0],
                email: session.email,
            },
            item_details: [
                {
                    id: planCode,
                    price: amount,
                    quantity: 1,
                    name: `LoopLive AI - ${plan.name} (${period})`,
                }
            ],
            callbacks: {
                finish: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/admin/subscription?order_id=${orderId}`
            }
        };

        const transaction = await midtransSnap.createTransaction(parameter);

        return NextResponse.json({
            token: transaction.token,
            redirect_url: transaction.redirect_url,
            orderId: orderId
        });

    } catch (error: any) {
        console.error("Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
