"use client";

import React, { useEffect, useState } from "react";
import { User, Mail, Save, Loader2, ShieldCheck, Calendar } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setUser(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: user.display_name,
          email: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setSuccess("Profile updated successfully!");
      // Trigger layout refresh if needed
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium">Memuat profil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Profil Akun</h2>
          <p className="text-slate-500 mt-1">Kelola informasi identitas dan kredensial Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Col: Info Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center space-y-4 backdrop-blur-xl">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-1 shadow-2xl shadow-blue-500/20">
              <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center text-3xl font-black text-white">
                {user?.display_name ? user.display_name[0].toUpperCase() : user?.email[0].toUpperCase()}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{user?.display_name || "Tanpa Nama"}</h3>
              <p className="text-slate-500 text-sm">{user?.email}</p>
            </div>
            <div className="w-full pt-4 border-t border-slate-800 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Calendar size={12} />
                <span>Terdaftar: {new Date(user?.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                <ShieldCheck size={12} />
                <span>Status: Terverifikasi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Edit Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                <User size={20} />
              </div>
              <h3 className="text-xl font-bold text-white">Informasi Dasar</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Nama Tampilan</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={user?.display_name || ""}
                    onChange={(e) => setUser({ ...user, display_name: e.target.value })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                    placeholder="Masukkan nama Anda"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Alamat Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within:text-purple-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={user?.email || ""}
                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-medium">
                {success}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>

          {/* Security Note */}
          <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-3xl flex gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
               <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Keamanan Akun</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Jika Anda ingin mengubah kata sandi atau mengaktifkan autentikasi dua faktor, silakan hubungi administrator sistem atau tunggu pembaruan fitur keamanan berikutnya.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
