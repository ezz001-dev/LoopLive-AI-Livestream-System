import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { notFound } from "next/navigation";
import ClientSessionPage from "@/components/admin/ClientSessionPage";

export default async function SessionControlPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const tenantId = await getCurrentTenantId();

  const session = await (prisma.live_sessions as any).findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      video: true,
      chat_logs: {
        orderBy: { created_at: "desc" },
        take: 5
      },
      ai_reply_logs: {
        orderBy: { created_at: "desc" },
        take: 5
      },
      schedules: true
    }
  });

  if (!session) notFound();

  return <ClientSessionPage session={session as any} />;
}
