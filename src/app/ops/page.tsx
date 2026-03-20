import React from "react";
import { prisma } from "@/lib/prisma";
import TenantStatusActions from "@/components/ops/TenantStatusActions";
import Link from "next/link";
import PlatformConfig from "@/components/ops/PlatformConfig";
import { DollarSign, Clock } from "lucide-react";
import TenantLimitAction from "@/components/ops/TenantLimitAction";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const [
    tenantCount,
    userCount,
    sessionCount,
    tenants,
    recentAudits,
    usageStats,
    recentLogs,
    allSubscriptions,
  ] = await Promise.all([
    (prisma as any).tenants.count(),
    (prisma as any).users.count(),
    (prisma.live_sessions as any).count(),
    (prisma as any).tenants.findMany({
      orderBy: { created_at: "asc" },
      select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          max_stream_minutes_override: true,
          _count: {
            select: {
                users: true,
                videos: true,
                live_sessions: true,
            },
          },
      }
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
    // User management: tenants with their subscription & top user info
    (prisma as any).tenants.findMany({
      orderBy: { created_at: "desc" },
      include: {
        users: {
          take: 1,
          include: { user: { select: { email: true, display_name: true } } },
          orderBy: { created_at: "asc" },
          where: { role: "owner" },
        },
        subscriptions: {
          take: 1,
          orderBy: { created_at: "desc" },
          include: { plan: { select: { max_stream_minutes_per_day: true } } },
        },
        max_stream_minutes_override: true,
      },
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
                  <th className="px-5 py-4 text-right">Limit (Min)</th>
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
                    <td className="px-5 py-4 text-right">
                       <TenantLimitAction 
                          tenantId={tenant.id} 
                          currentOverride={tenant.max_stream_minutes_override}
                          planLimit={180} // Free trial default for guest view
                       />
                    </td>
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

      {/* User Management Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">User Management</h3>
            <p className="mt-1 text-sm text-slate-400">Status langganan dan trial seluruh pengguna platform.</p>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
            {allSubscriptions.length} workspace
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/70 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-5 py-4">Workspace / Owner</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Trial / Berakhir</th>
                <th className="px-5 py-4 text-right">Live Limit</th>
                <th className="px-5 py-4">Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {allSubscriptions.map((t: any) => {
                const sub = t.subscriptions?.[0];
                const owner = t.users?.[0]?.user;
                const isTrial = !sub || sub.plan_code === "free_trial";
                const isExpired = isTrial && sub?.trial_ends_at && new Date(sub.trial_ends_at) < new Date();
                const isPaid = sub && sub.plan_code !== "free_trial" && sub.status === "active";
                const daysLeft = sub?.trial_ends_at
                  ? Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <tr key={t.id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{owner?.email || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${
                        isPaid
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                      }`}>
                        {sub?.plan_code?.replace("_", " ") || "Free Trial"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${
                        isExpired
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          : isPaid
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }`}>
                        {isExpired ? "EXPIRED" : isPaid ? "ACTIVE" : "TRIALING"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {isTrial && sub?.trial_ends_at
                        ? isExpired
                          ? <span className="text-rose-400 font-bold">Habis {new Date(sub.trial_ends_at).toLocaleDateString("id-ID")}</span>
                          : <span className="text-amber-400">{daysLeft} hari lagi</span>
                        : isPaid
                        ? <span className="text-emerald-400">
                            s/d {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("id-ID") : "—"}
                          </span>
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                        <TenantLimitAction 
                            tenantId={t.id} 
                            currentOverride={t.max_stream_minutes_override}
                            planLimit={sub?.plan?.max_stream_minutes_per_day ?? 180}
                        />
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(t.created_at).toLocaleDateString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
