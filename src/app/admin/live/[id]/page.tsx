import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientSessionPage from "@/components/admin/ClientSessionPage";

export default async function SessionControlPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const session = await prisma.live_sessions.findUnique({
    where: { id },
    include: {
      video: true,
      chat_logs: {
        orderBy: { created_at: "desc" },
        take: 5
      },
      ai_reply_logs: {
        orderBy: { created_at: "desc" },
        take: 5
      }
    }
  });

  if (!session) notFound();

  return <ClientSessionPage session={session as any} />;
}
