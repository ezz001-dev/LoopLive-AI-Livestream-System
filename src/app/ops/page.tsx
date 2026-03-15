import React from "react";
import { prisma } from "@/lib/prisma";

export default async function OpsPage() {
  const [tenantCount, userCount, sessionCount] = await Promise.all([
    (prisma as any).tenants.count(),
    (prisma as any).users.count(),
    (prisma.live_sessions as any).count(),
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

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
        <h3 className="text-lg font-bold">Next Step</h3>
        <p className="mt-2 text-slate-400">
          Tahap berikutnya adalah memindahkan fungsi support platform, audit tenant, dan suspend workspace ke surface ini,
          sementara `/admin` tetap fokus untuk tenant-facing workflow.
        </p>
      </section>
    </div>
  );
}
