"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Video, Radio, Settings, LogOut, HelpCircle, Shield } from "lucide-react";
import TourGuide from "../../components/admin/TourGuide";

type NavLinkProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  id?: string;
};

function NavLink({ href, icon, label, id }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      id={id}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
        isActive 
          ? "bg-slate-800 text-white border border-slate-700 shadow-lg shadow-black/20" 
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      }`}
    >
      <>
        <span className="flex items-center gap-3 w-full">
          <span className={isActive ? "text-blue-400" : "group-hover:text-white transition-colors"}>
            {icon}
          </span>
          <span className="font-medium">{label}</span>
        </span>
        {isActive && (
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        )}
      </>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [canAccessOps, setCanAccessOps] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (active) {
          setCanAccessOps(Boolean(data?.session?.canAccessOps));
        }
      } catch (error) {
        console.error("Failed to load auth session", error);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    // We can just set a past expiry date on the cookie via a helper API or directly in browser if permitted
    // But the most reliable way is an API call
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6" id="tour-logo">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            LoopLive AI
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Workspace</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavLink href="/admin" id="tour-nav-dashboard" icon={<LayoutDashboard size={20} className="group-hover:scale-110 transition-transform" />} label="Ringkasan" />
          <NavLink href="/admin/videos" id="tour-nav-videos" icon={<Video size={20} className="group-hover:scale-110 transition-transform" />} label="Video" />
          <NavLink href="/admin/live" id="tour-nav-live" icon={<Radio size={20} className="group-hover:scale-110 transition-transform" />} label="Sesi Live" />
          <NavLink href="/admin/settings" id="tour-nav-settings" icon={<Settings size={20} className="group-hover:scale-110 transition-transform" />} label="Pengaturan" />
          {canAccessOps && (
            <NavLink
              href="/ops"
              icon={<Shield size={20} className="group-hover:scale-110 transition-transform" />}
              label="Ops Console"
            />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            id="tour-logout"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all w-full text-left"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 bg-slate-950 overflow-y-auto">
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-500 text-sm">
            <span className="hover:text-slate-300 cursor-pointer">Pages</span>
            <span>/</span>
            <span className="text-slate-100 font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              id="start-tour-button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
            >
              <HelpCircle size={14} />
              Panduan Singkat
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20" />
            <span className="text-sm font-medium">Admin</span>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
        <TourGuide />
      </main>
    </div>
  );
}
