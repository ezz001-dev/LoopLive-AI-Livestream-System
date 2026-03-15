"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function SuspendedPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-900/50 p-10 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300">
          <ShieldAlert size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-white">Workspace Suspended</h1>
        <p className="mt-3 text-slate-400">
          Workspace Anda sedang dinonaktifkan sementara, jadi akses ke dashboard tenant dan aksi streaming dibatasi.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Silakan hubungi tim support atau administrator platform untuk mengaktifkannya kembali.
        </p>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
