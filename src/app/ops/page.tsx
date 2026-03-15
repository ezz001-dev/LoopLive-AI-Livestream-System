import React from "react";
import { prisma } from "@/lib/prisma";
import TenantStatusActions from "@/components/ops/TenantStatusActions";

export default async function OpsPage() {
  const [tenantCount, userCount, sessionCount, tenants, recentVideos, recentSessions] = await Promise.all([
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
    (prisma.videos as any).findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        filename: true,
        created_at: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    (prisma.live_sessions as any).findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  const cards = [
    {
      label: "Tenants",
      value: tenantCount,
      tone: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
      note: "Workspace pelanggan yang sudah tercatat",
    },
    {
      label: "Users",
      value: userCount,
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      note: "Akun yang siap dipetakan ke tenant",
    },
    {
      label: "Live Sessions",
      value: sessionCount,
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      note: "Total sesi lintas tenant saat ini",
    },
  ];

  const activityFeed = [
    ...recentVideos.map((video: any) => ({
      id: `video-${video.id}`,
      type: "Video Uploaded",
      title: video.filename,
      tenantName: video.tenant?.name || "Unknown Tenant",
      createdAt: video.created_at,
    })),
    ...recentSessions.map((session: any) => ({
      id: `session-${session.id}`,
      type: `Session ${session.status}`,
      title: session.title,
      tenantName: session.tenant?.name || "Unknown Tenant",
      createdAt: session.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <h2 className="text-3xl font-bold tracking-tight">Internal Operations Surface</h2>
        <p className="mt-2 max-w-3xl text-slate-400">
          Console ini dipisahkan dari tenant dashboard agar aktivitas operasional platform,
          support, dan audit tidak bercampur dengan area kerja customer.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${card.tone}`}>
              {card.label}
            </span>
            <p className="mt-4 text-4xl font-bold">{card.value}</p>
            <p className="mt-2 text-sm text-slate-400">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Workspace Directory</h3>
              <p className="mt-1 text-sm text-slate-400">
                Daftar tenant yang aktif di platform, lengkap dengan status dan beban operasional singkat.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
              {tenants.length} workspace
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left">
              <thead className="bg-slate-900/70 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Assets</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3 text-right">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenants.map((tenant: any) => (
                  <tr key={tenant.id} className="bg-slate-950/20">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-white">{tenant.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{tenant.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${
                          tenant.status === "suspended"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{tenant._count.users}</td>
                    <td className="px-4 py-4 text-slate-300">{tenant._count.videos}</td>
                    <td className="px-4 py-4 text-slate-300">{tenant._count.live_sessions}</td>
                    <td className="px-4 py-4 text-right">
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

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
          <h3 className="text-lg font-bold">Platform Activity</h3>
          <p className="mt-1 text-sm text-slate-400">
            Feed audit ringan untuk memantau aktivitas tenant lintas asset dan session.
          </p>

          <div className="mt-6 space-y-4">
            {activityFeed.length > 0 ? (
              activityFeed.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                        {entry.type}
                      </p>
                      <p className="mt-2 font-semibold text-white">{entry.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{entry.tenantName}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-500">
                Belum ada aktivitas lintas tenant yang bisa ditampilkan.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
