import React from "react";
import Link from "next/link";

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-400">
              Internal Ops
            </p>
            <h1 className="mt-1 text-2xl font-bold">LoopLive Platform Console</h1>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"
          >
            Back to Tenant Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8">{children}</main>
    </div>
  );
}
