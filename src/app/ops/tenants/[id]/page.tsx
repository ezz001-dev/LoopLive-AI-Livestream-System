import React from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import TenantStatusActions from "@/components/ops/TenantStatusActions";
import SessionResetAction from "@/components/ops/SessionResetAction";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { workerManager } from "@/lib/worker-manager";

export default async function TenantOpsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  const tenant = await (prisma as any).tenants.findUnique({
    where: { id },
    include: {
      settings: true,
      _count: {
        select: {
          users: true,
          videos: true,
          live_sessions: true,
        },
      },
    },
  });

  if (!tenant) notFound();

  const [sessions, audits, usage] = await Promise.all([
    (prisma.live_sessions as any).findMany({
      where: { tenant_id: id },
      include: { video: true },
      orderBy: { created_at: "desc" },
    }),
    (prisma as any).audit_logs.findMany({
      where: { tenant_id: id },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
    (prisma as any).usage_records.findMany({
      where: { tenant_id: id },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/ops" className="text-sm font-medium text-slate-500 hover:text-white transition-colors flex items-center gap-2">
             ← Back to Directory
          </Link>
          <h2 className="mt-4 text-4xl font-black text-white">{tenant.name}</h2>
          <p className="mt-1 text-slate-500 font-mono text-sm uppercase tracking-widest">{tenant.id}</p>
        </div>
        <div className="flex gap-3">
          <TenantStatusActions tenantId={tenant.id} tenantName={tenant.name} status={tenant.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
           <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Status</p>
           <p className={`mt-3 text-lg font-bold ${tenant.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
             {tenant.status.toUpperCase()}
           </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
           <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Users</p>
           <p className="mt-3 text-2xl font-black text-white">{tenant._count.users}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
           <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Asset Count</p>
           <p className="mt-3 text-2xl font-black text-white">{tenant._count.videos}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
           <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Sessions</p>
           <p className="mt-3 text-2xl font-black text-white">{tenant._count.live_sessions}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
           {/* Sessions Section */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8">
            <h3 className="text-xl font-bold text-white mb-6">Streaming Sessions</h3>
            <div className="grid gap-4">
              {sessions.length > 0 ? sessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/40 border border-slate-800">
                   <div>
                      <p className="font-bold text-white">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-1 italic">{s.video?.filename || 'No Video'}</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${
                        s.status === 'LIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {s.status}
                      </span>
                      {s.status === 'LIVE' && (() => {
                         const hb = workerManager.getHeartbeat(s.id);
                         if (!hb) return null;
                         const diff = Math.floor((Date.now() - hb) / 1000);
                         return (
                           <span className={`text-[9px] font-bold ${diff > 30 ? 'text-rose-400' : 'text-emerald-400 opacity-60'}`}>
                             {diff > 60 ? 'STALLED?' : `${diff}s ago`}
                           </span>
                         );
                      })()}
                      <SessionResetAction sessionId={s.id} title={s.title} status={s.status} />
                      <Link href={`/admin/live/${s.id}`} className="text-xs font-bold text-cyan-400 hover:text-cyan-300">View Details →</Link>
                   </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500 py-8 text-center italic">No sessions found for this tenant.</p>
              )}
            </div>
          </section>

          {/* Usage Table */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8">
            <h3 className="text-xl font-bold text-white mb-6">Detailed Consumption</h3>
            <div className="overflow-hidden rounded-2xl border border-slate-800">
               <table className="w-full text-left">
                  <thead className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                    <tr>
                      <th className="px-5 py-3">Metric</th>
                      <th className="px-5 py-3 text-right">Qty</th>
                      <th className="px-5 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usage.map((u: any) => (
                      <tr key={u.id} className="text-sm">
                        <td className="px-5 py-3 text-white font-medium">{u.metric.replace('_', ' ')}</td>
                        <td className="px-5 py-3 text-right text-slate-300 font-mono">{Number(u.quantity).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-slate-500 text-xs">
                           {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {usage.length === 0 && (
                       <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-500 italic">No usage records yet.</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
          </section>

          {/* Execution Health / Errors */}
          <section className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-8">
             <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="text-rose-500" size={20} />
                <h3 className="text-xl font-bold text-white">Execution Health / Errors</h3>
             </div>
             <div className="space-y-4">
                {audits.filter((a: any) => a.action.includes('FAIL') || a.action.includes('ERROR') || (a.metadata && (a.metadata as any).error)).map((e: any) => (
                  <div key={e.id} className="p-4 rounded-2xl bg-slate-950/60 border border-rose-500/20 flex gap-4">
                     <div className="h-10 w-10 shrink-0 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <ShieldAlert size={20} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-rose-400">{e.action}</p>
                        <p className="mt-1 text-sm text-slate-300 font-mono break-words">
                          {((e.metadata as any)?.error) || ((e.metadata as any)?.reason) || "Unknown operational error"}
                        </p>
                        <p className="mt-2 text-[10px] text-slate-500 font-bold">
                           Target: {e.target_type} ({e.target_id}) • {new Date(e.created_at).toLocaleString()}
                        </p>
                     </div>
                  </div>
                ))}
                {audits.filter((a: any) => a.action.includes('FAIL') || a.action.includes('ERROR') || (a.metadata && (a.metadata as any).error)).length === 0 && (
                  <p className="text-sm text-slate-600 italic text-center py-4">No recent execution errors found.</p>
                )}
             </div>
          </section>
        </div>

        <div className="space-y-8">
           {/* Audit Log Vertical Feed */}
           <section className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8 h-fit">
              <h3 className="text-xl font-bold text-white mb-6">Audit Trail</h3>
              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
                {audits.map((a: any) => (
                  <div key={a.id} className="relative pl-10">
                     <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">{a.action.replace('_',' ')}</p>
                        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                          Actor: <span className="text-slate-400 font-medium">{a.actor_type.toUpperCase()}</span> • {new Date(a.created_at).toLocaleString([], { hour: '2-digit', minute:'2-digit' })}
                        </p>
                        {a.metadata && Object.keys(a.metadata as any).length > 0 && (
                          <div className="mt-2 p-2 rounded bg-slate-950/50 border border-slate-800/50 text-[10px] text-slate-600 font-mono overflow-hidden truncate">
                             {JSON.stringify(a.metadata)}
                          </div>
                        )}
                     </div>
                  </div>
                ))}
                {audits.length === 0 && (
                  <p className="text-xs text-slate-500 py-4 text-center">Clean history.</p>
                )}
              </div>
           </section>

           {/* Settings Snapshot */}
           <section className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8">
              <h3 className="text-xl font-bold text-white mb-4">Core Settings</h3>
              <div className="space-y-4">
                 <div className="flex justify-between text-xs py-2 border-b border-slate-800/50">
                    <span className="text-slate-500 font-bold tracking-widest uppercase">AI Provider</span>
                    <span className="text-slate-200 uppercase font-black">{tenant.settings?.ai_provider || 'OpenAI'}</span>
                 </div>
                 <div className="flex justify-between text-xs py-2 border-b border-slate-800/50">
                    <span className="text-slate-500 font-bold tracking-widest uppercase">TTS Provider</span>
                    <span className="text-slate-200 uppercase font-black">{tenant.settings?.tts_provider || 'OpenAI'}</span>
                 </div>
                 <div className="flex justify-between text-xs py-2">
                    <span className="text-slate-500 font-bold tracking-widest uppercase">Storage</span>
                    <span className="text-slate-200 uppercase font-black">{tenant.settings?.storage_provider || 'Local'}</span>
                 </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
