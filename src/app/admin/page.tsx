import React from "react";
import { Radio, Users, Video, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import LiveSessionsHeader from "@/components/admin/LiveSessionsHeader";

export default async function DashboardPage() {
  const tenantId = await getCurrentTenantId();

  // Fetch real statistics
  const [activeStreams, totalViewersData, totalVideos, recentSessions] = await Promise.all([
    (prisma.live_sessions as any).count({ where: { tenant_id: tenantId, status: "LIVE" } }),
    (prisma.live_sessions as any).aggregate({ where: { tenant_id: tenantId }, _sum: { viewer_count: true } }),
    (prisma.videos as any).count({ where: { tenant_id: tenantId } }),
    (prisma.live_sessions as any).findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
      take: 4,
    }),
  ]);

  const totalViewers = totalViewersData._sum.viewer_count || 0;
  
  // Estimate stream hours (simplified logic: total sessions * average duration or just a static high number for now)
  // Since we don't have duration tracking yet, we'll keep it as a placeholder but more realistic
  const totalSessions = await (prisma.live_sessions as any).count({ where: { tenant_id: tenantId } });
  const estimatedHours = totalSessions * 1.5; // Placeholder multiplier

  const stats = [
    { label: "Active Streams", value: activeStreams.toString(), icon: Radio, iconColor: "text-green-400", bg: "bg-green-500/10" },
    { label: "Total Viewers", value: totalViewers > 1000 ? `${(totalViewers / 1000).toFixed(1)}k` : totalViewers.toString(), icon: Users, iconColor: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Videos", value: totalVideos.toString(), icon: Video, iconColor: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Total Sessions", value: totalSessions.toString(), icon: Clock, iconColor: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">System Overview</h2>
          <p className="text-slate-400 mt-1">Monitor your AI livestream infrastructure performance.</p>
        </div>
        <LiveSessionsHeader />
      </div>

      <div id="tour-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors group">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.iconColor} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-400 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl h-80 flex flex-col justify-center items-center text-slate-500 italic">
          <div className="text-center">
            <Radio size={48} className="mx-auto mb-4 opacity-10" />
            <p>Real-time Stream Performance Analytics</p>
            <p className="text-xs mt-2 not-italic">Connection status: WebSocket Active</p>
          </div>
        </div>
        <div id="tour-recent-sessions" className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl h-80 flex flex-col pt-6 overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-4">Recent Sessions</h3>
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {recentSessions.length > 0 ? (
              recentSessions.map((session: any) => (
                <div key={session.id} className="flex gap-4 items-start group">
                  <div className={`h-2 w-2 rounded-full mt-2 transition-all ${session.status === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                  <div>
                    <p className="text-sm text-slate-200 font-medium group-hover:text-blue-400 transition-colors truncate max-w-[180px]">
                      {session.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {session.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic text-sm py-10 text-center">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
