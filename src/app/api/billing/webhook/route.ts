import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMidtransNotification } from "@/lib/midtrans";
import { addDays } from "date-fns";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // 1. Verify notification with Midtrans
        const statusResponse = await verifyMidtransNotification(body);
        
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`Midtrans Webhook Received: ${orderId} - ${transactionStatus}`);

        // 2. Find the transaction in our DB
        const transaction = await (prisma as any).transactions.findUnique({
            where: { order_id: orderId }
        });

        if (!transaction) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        // 3. Process status
        let newStatus = "pending";
        let isSuccess = false;

        if (transactionStatus === 'capture') {
            if (fraudStatus === 'challenge') {
                newStatus = "challenge";
            } else if (fraudStatus === 'accept') {
                newStatus = "settlement";
                isSuccess = true;
            }
        } else if (transactionStatus === 'settlement') {
            newStatus = "settlement";
            isSuccess = true;
        } else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
            newStatus = "failed";
        } else if (transactionStatus === 'expire') {
            newStatus = "expired";
        } else if (transactionStatus === 'pending') {
            newStatus = "pending";
        }

        // 4. Update transaction
        await (prisma as any).transactions.update({
            where: { id: transaction.id },
            data: {
                status: newStatus,
                payment_type: statusResponse.payment_type,
                transaction_id: statusResponse.transaction_id,
                fraud_status: fraudStatus
            }
        });

        // 5. If success, update/create subscription
        if (isSuccess) {
            const metadata = (transaction.metadata as any) || {};
            const period = metadata.period || "monthly";
            const daysToAdd = period === "yearly" ? 365 : 30;

            const existingSub = await (prisma as any).subscriptions.findFirst({
                where: { tenant_id: transaction.tenant_id },
                orderBy: { created_at: "desc" }
            });

            const now = new Date();
            let startDate = now;

            // If they have an active sub, extend from its end date
            if (existingSub && existingSub.status === "active" && existingSub.current_period_end > now) {
                startDate = new Date(existingSub.current_period_end);
            }

            const endDate = addDays(startDate, daysToAdd);

            await (prisma as any).subscriptions.upsert({
                where: { id: existingSub?.id || 'new-sub' },
                update: {
                    plan_code: transaction.plan_code,
                    status: "active",
                    current_period_end: endDate,
                    updated_at: now
                },
                create: {
                    tenant_id: transaction.tenant_id,
                    plan_code: transaction.plan_code,
                    plan_period: period,
                    status: "active",
                    current_period_end: endDate,
                    billing_provider: "midtrans",
                    billing_subscription_id: transaction.order_id
                }
            });

            console.log(`Subscription updated for tenant ${transaction.tenant_id} until ${endDate}`);
        }

        return NextResponse.json({ status: "ok" });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
