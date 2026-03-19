"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Video, Radio, Settings, LogOut, HelpCircle, Shield, CreditCard, User, Users, Menu, X, BookOpen, AlertCircle } from "lucide-react";
import TourGuide from "../../components/admin/TourGuide";
import SubscriptionStatus from "../../components/SubscriptionStatus";

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
  const pathname = usePathname();
  const [canAccessOps, setCanAccessOps] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [subscription, setSubscription] = React.useState<any>(null);

  React.useEffect(() => {
    let active = true;
    
    async function loadSubscription() {
      try {
        const res = await fetch("/api/subs/status");
        if (res.ok) {
          const data = await res.json();
          if (active) setSubscription(data.subscription);
        }
      } catch (err) {
        console.error("Failed to load subscription in layout", err);
      }
    }

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

    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (active) setUserProfile(data);
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    }

    void loadSession();
    void loadProfile();
    void loadSubscription();

    const handleProfileUpdate = () => void loadProfile();
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      active = false;
      window.removeEventListener("profile-updated", handleProfileUpdate);
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] bg-slate-950">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 z-[50] lg:static lg:translate-x-0
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 flex items-center justify-between" id="tour-logo">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              LoopLive AI
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Workspace</p>
          </div>
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <NavLink href="/admin" id="tour-nav-dashboard" icon={<LayoutDashboard size={20} className="group-hover:scale-110 transition-transform" />} label="Ringkasan" />
          <NavLink href="/admin/videos" id="tour-nav-videos" icon={<Video size={20} className="group-hover:scale-110 transition-transform" />} label="Video" />
          <NavLink href="/admin/live" id="tour-nav-live" icon={<Radio size={20} className="group-hover:scale-110 transition-transform" />} label="Sesi Live" />
          <NavLink href="/admin/team" icon={<Users size={20} className="group-hover:scale-110 transition-transform" />} label="Tim & Kolaborasi" />
          <NavLink href="/admin/billing" icon={<CreditCard size={20} className="group-hover:scale-110 transition-transform" />} label="Tagihan & Paket" />
          <NavLink href="/admin/documents" icon={<BookOpen size={20} className="group-hover:scale-110 transition-transform" />} label="Knowledge Base" />
          <NavLink href="/admin/profile" icon={<User size={20} className="group-hover:scale-110 transition-transform" />} label="Profil Akun" />
          <NavLink href="/admin/settings" id="tour-nav-settings" icon={<Settings size={20} className="group-hover:scale-110 transition-transform" />} label="Pengaturan" />
          {canAccessOps && (
            <NavLink
              href="/ops"
              icon={<Shield size={20} className="group-hover:scale-110 transition-transform" />}
              label="Ops Console"
            />
          )}
        </nav>

        <div className="px-4 mb-4">
           <SubscriptionStatus />
        </div>

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
      <main className="flex-1 overflow-x-hidden flex flex-col min-h-[100dvh]">
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center gap-4 text-slate-500 text-sm">
              <span className="hover:text-slate-300 cursor-pointer">Pages</span>
              <span>/</span>
              <span className="text-slate-100 font-medium">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              id="start-tour-button"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
            >
              <HelpCircle size={14} />
              Panduan Singkat
            </button>
            <Link href="/admin/profile" className="flex items-center gap-2 md:gap-3 hover:bg-slate-800 p-1 md:pr-3 rounded-full transition-all group">
              <>
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 flex items-center justify-center text-[10px] font-black text-white">
                  {String(userProfile?.display_name ? userProfile.display_name[0].toUpperCase() : (userProfile?.email ? userProfile.email.charAt(0).toUpperCase() : "A"))}
                </div>
                <span className="text-sm font-medium group-hover:text-blue-400 transition-colors hidden sm:inline">
                  {String(userProfile?.display_name || userProfile?.email || "Admin")}
                </span>
              </>
            </Link>
          </div>
        </header>

        {/* Global Trial Alert */}
        {subscription && (subscription.planCode === "free_trial" || subscription.planCode === "trial") && 
          subscription.trialEndsAt && new Date(subscription.trialEndsAt) < new Date() && (
          <div className="bg-red-600 px-4 md:px-8 py-2 text-white flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span>Masa trial Anda telah habis. Streaming dan fitur utama telah dikunci.</span>
            </div>
            <Link href="/admin/billing" className="bg-white text-red-600 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors uppercase tracking-tight">
              Upgrade Sekarang
            </Link>
          </div>
        )}

        <div className="flex-1 p-4 md:p-8 pb-32 md:pb-32 lg:pb-16">
          {children}
        </div>
        <TourGuide />
      </main>
    </div>
  );
}
