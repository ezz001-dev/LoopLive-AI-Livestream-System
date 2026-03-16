import React from "react";

import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import Link from "next/link";
import LiveSessionsHeader from "@/components/admin/LiveSessionsHeader";
import LiveSessionActions from "@/components/admin/LiveSessionActions";



export default async function LiveSessionsPage() {
  const tenantId = await getCurrentTenantId();

  const sessions = await (prisma.live_sessions as any).findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: "desc" }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Sesi Live</h2>
          <p className="text-slate-400 mt-1">Buat, jadwalkan, dan jalankan live ke YouTube atau TikTok dari satu tempat.</p>
        </div>
        <LiveSessionsHeader />
      </div>

      <div className="bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Session Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">AI Tone</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Created At</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sessions.map((session: any) => (
              <tr key={session.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-5">
                  {(() => {
                    const loopMode = (session as any).loop_mode === "count" ? "count" : "infinite";
                    const loopCount = Number((session as any).loop_count || 1);
                    const loopLabel =
                      loopMode === "count"
                        ? loopCount === 1
                          ? "Once"
                          : `x${loopCount}`
                        : "Infinite";
                    const loopClasses =
                      loopMode === "count"
                        ? loopCount === 1
                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                        : "border border-cyan-500/20 bg-cyan-500/10 text-cyan-300";

                    return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/live/${session.id}`} className="font-bold text-white hover:text-blue-400 transition-colors text-lg">
                        {session.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1 truncate max-w-xs">{session.context_text}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${loopClasses}`}>
                      {loopLabel}
                    </span>
                  </div>
                    );
                  })()}
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    session.status === 'LIVE' 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${session.status === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                    {session.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <span className="text-slate-300 font-medium capitalize">{session.ai_tone || 'Professional'}</span>
                </td>
                <td className="px-6 py-5 text-slate-500 text-sm">
                  {new Date(session.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-5 text-right">
                  <LiveSessionActions 
                    sessionId={session.id} 
                    initialStatus={session.status} 
                    sessionTitle={session.title}
                  />
                </td>

              </tr>
            ))}
          </tbody>
        </table>


        {sessions.length === 0 && (
          <div className="py-20 text-center text-slate-500 italic">
            Belum ada sesi live yang dibuat.
          </div>
        )}
      </div>
    </div>
  );
}
