import { prisma } from "./prisma";
import { sendEmail } from "./email";

/**
 * sendStreamFailureAlert
 * Notifies the workspace owner when a stream has completely failed
 * and reached the maximum restart attempts.
 */
export async function sendStreamFailureAlert(tenantId: string, sessionId: string) {
  try {
    // 1. Fetch Session and Workspace Info
    const session = await (prisma.live_sessions as any).findUnique({
      where: { id: sessionId },
      include: {
        tenant: {
          include: {
            users: {
              where: { role: "owner" },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!session || !session.tenant) return;

    const owners = session.tenant.users;
    const sessionTitle = session.title;
    const workspaceName = session.tenant.name;

    for (const entry of owners) {
      if (!entry.user?.email) continue;

      const email = entry.user.email;
      console.log(`[Alerts] Sending stream failure alert to ${email} for session ${sessionId}`);

      await sendEmail({
        to: email,
        subject: `🚨 Stream Failure: ${sessionTitle}`,
        text: `The livestream "${sessionTitle}" in workspace "${workspaceName}" has stopped after multiple failed attempts to restart. Please check your dashboard.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px; background-color: #fef2f2;">
            <h2 style="color: #991b1b; margin-top: 0;">Livestream Failure</h2>
            <p style="color: #451a1a;">The following stream has stopped repeatedly and requires manual intervention:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #7f1d1d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Session Title</p>
              <p style="margin: 4px 0 16px 0; font-size: 18px; color: #1e293b; font-weight: bold;">${sessionTitle}</p>
              
              <p style="margin: 0; font-size: 14px; color: #7f1d1d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Workspace</p>
              <p style="margin: 4px 0 0 0; font-size: 16px; color: #475569;">${workspaceName}</p>
            </div>
            
            <p style="color: #451a1a; font-size: 14px;">Our automated systems tried to restart the stream multiple times without success. This usually happens if the source video file is corrupted or the destination RTMP server is rejecting the connection.</p>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/admin/live/${sessionId}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to Live Dashboard</a>
            </div>
          </div>
        `,
      });
    }
  } catch (error) {
    console.error(`[Alerts] Failed to send stream failure alert for session ${sessionId}:`, error);
  }
}
