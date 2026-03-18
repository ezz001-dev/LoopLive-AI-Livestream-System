import React from "react";
import { prisma } from "@/lib/prisma";
import TenantStatusActions from "@/components/ops/TenantStatusActions";
import Link from "next/link";
import PlatformConfig from "@/components/ops/PlatformConfig";
import { DollarSign } from "lucide-react";

export default async function OpsPage() {
  const [
    tenantCount,
    userCount,
    sessionCount,
    tenants,
    recentAudits,
    usageStats,
    recentLogs,
  ] = await Promise.all([
    (prisma as any).tenants.count(),
    (prisma as any).users.count(),
    (prisma.live_sessions as any).count(),
    (prisma as any).tenants.findMany({
      orderBy: { created_at: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            videos: true,
            live_sessions: true,
          },
        },
      },
    }),
    (prisma as any).audit_logs.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      include: {
        tenant: {
          select: { name: true, slug: true },
        },
        user: {
          select: { display_name: true, email: true },
        },
      },
    }),
    (prisma as any).usage_records.groupBy({
      by: ["metric"],
      _sum: {
        quantity: true,
      },
    }),
    (prisma as any).tenant_logs.findMany({
        orderBy: { created_at: "desc" },
        take: 10,
        include: {
            tenant: {
                select: { name: true, slug: true }
            },
            user: {
                select: { display_name: true, email: true }
            }
        }
    }),
  ]);

  const cards = [
    {
      label: "Tenants",
      value: tenantCount,
      tone: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
      note: "Workspace pelanggan aktif",
    },
    {
      label: "Users",
      value: userCount,
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      note: "Total identitas pengguna",
    },
    {
      label: "Live Sessions",
      value: sessionCount,
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      note: "Total sesi lintas tenant",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">Platform Operations Surface</h2>
        <p className="mt-2 max-w-3xl text-slate-400">
          Monitoring terpusat untuk aktivitas tenant, audit akses, dan metering penggunaan platform.
        </p>
        
        <div className="mt-8 flex flex-wrap gap-4 pt-8 border-t border-slate-800">
           <PlatformConfig />
           <Link 
             href="/ops/plans"
             className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300 transition-all hover:border-rose-500 hover:bg-rose-500/20"
           >
             <>
               <DollarSign size={16} /> Manage Commercial Plans
             </>
           </Link>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${card.tone}`}>
              {card.label}
            </span>
            <p className="mt-4 text-4xl font-bold text-white">{card.value}</p>
            <p className="mt-1 text-sm text-slate-400">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
        <h3 className="text-lg font-bold text-white">Platform Cumulative Usage</h3>
        <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
           {usageStats.map((stat: any) => {
             const maxQty = 1000; // Placeholder for normalization
             const percentage = Math.min(100, (Number(stat._sum.quantity) / maxQty) * 100);
             return (
               <div key={stat.metric} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-5 transition-all hover:border-slate-700">
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-300 transition-colors">{stat.metric.replace('_', ' ')}</p>
                    <p className="mt-3 text-3xl font-black text-white">
                      {Number(stat._sum.quantity).toLocaleString()}
                      <span className="ml-1.5 text-xs font-bold text-slate-500 uppercase">
                        {stat.metric === 'tts_seconds' ? 's' : stat.metric === 'stream_minutes' ? 'min' : ''}
                      </span>
                    </p>
                  </div>
                  {/* Gauge Backdrop */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-50" />
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-cyan-500/40 transition-all duration-1000 group-hover:bg-cyan-400" 
                    style={{ width: `${percentage}%` }}
                  />
               </div>
             );
           })}
           {usageStats.length === 0 && (
             <div className="col-span-full py-12 text-sm text-slate-500 italic text-center border border-dashed border-slate-800 rounded-3xl">
               No usage activity detected for this period.
             </div>
           )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        {/* Tenant Directory */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-white">Workspace Directory</h3>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
              {tenants.length} workspace
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left">
              <thead className="bg-slate-900/70 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-4">Workspace</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Users</th>
                  <th className="px-5 py-4">Assets</th>
                  <th className="px-5 py-4 text-right">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenants.map((tenant: any) => (
                  <tr key={tenant.id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/ops/tenants/${tenant.id}`} className="block">
                        <>
                          <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{tenant.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">/{tenant.slug}</p>
                        </>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${
                          tenant.status === "suspended"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">{tenant._count.users}</td>
                    <td className="px-5 py-4 text-sm text-slate-400">{tenant._count.videos}</td>
                    <td className="px-5 py-4 text-right">
                      <TenantStatusActions
                        tenantId={tenant.id}
                        tenantName={tenant.name}
                        status={tenant.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Feed */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
          <h3 className="text-lg font-bold text-white">Security & Audit logs</h3>
          <p className="mt-1 text-sm text-slate-400 italic">Real-time platform activity trail.</p>

          <div className="mt-6 space-y-4">
            {recentAudits.length > 0 ? (
              recentAudits.map((audit: any) => (
                <div key={audit.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                        {audit.action.replace('_', ' ')}
                      </p>
                      <p className="mt-2 text-sm font-medium text-white truncate">
                        Target: {audit.target_type} ({audit.target_id?.slice(0,8) || 'N/A'})
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                         <div className="h-4 w-4 rounded-full bg-slate-800 flex items-center justify-center text-[8px] border border-slate-700 uppercase font-bold text-slate-500">
                            {audit.actor_type[0]}
                         </div>
                         <p className="text-[11px] text-slate-500">
                           {audit.user?.display_name || 'System'} • {audit.tenant?.name || 'Platform'}
                         </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-600 font-medium">
                      {new Date(audit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-sm text-slate-500 text-center">
                Belum ada log audit tercatat.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Monitoring Section */}
      <section className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            Active Error Monitoring
          </h3>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
            {recentLogs.length} recent issues
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {recentLogs.length > 0 ? (
            recentLogs.map((log: any) => (
              <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 hover:border-rose-500/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-400">
                        {log.level}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {log.tenant?.name || "Global"}
                      </span>
                      {log.user && (
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                          • {log.user.display_name || log.user.email}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600 font-mono">
                         {log.component || "N/A"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white line-clamp-2">{log.message}</p>
                    
                    {log.metadata && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        {Object.entries(log.metadata).map(([key, val]: [string, any]) => (
                          <div key={key} className="min-w-0">
                            <p className="text-[9px] uppercase tracking-widest text-slate-500 truncate">{key}</p>
                            <p className="text-[10px] text-slate-300 truncate">{String(val)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
              <p className="text-sm text-slate-500 italic">No errors reported in the last cycle. System stable.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
