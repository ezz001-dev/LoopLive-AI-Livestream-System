"use client";

import React, { useEffect, useState } from "react";
import { Settings, Users, HardDrive, Zap, Radio, Save, Loader2, Info, Key, BrainCircuit } from "lucide-react";

export default function PlatformConfig() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/ops/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      setSettings(data);
      // Keys come masked from server; we keep local state empty unless user types new one
      setOpenaiKey("");
      setGeminiKey("");
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
      const payload: any = { ...settings };
      // Only include keys if user typed a new one (not empty)
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();
      else delete payload.openai_api_key;
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      else delete payload.gemini_api_key;

      const res = await fetch("/api/ops/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update settings");
      setOpenaiKey(""); // clear inputs after save
      setGeminiKey("");
      setSuccess("Konfigurasi platform berhasil diperbarui!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
          <Settings size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Global Platform Configuration</h3>
          <p className="text-xs text-slate-500">Kelola kuota pendaftaran, limit paket trial, dan API Key platform.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Platform System API Keys */}
        <div className="bg-slate-900/40 border border-amber-500/20 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Key size={16} />
              <h4 className="text-sm font-bold uppercase tracking-wider">Platform System API Keys</h4>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase">Super Admin Only</span>
          </div>
          <p className="text-xs text-slate-500 -mt-2 mb-3">
            API Key ini digunakan oleh semua user yang tidak mengunakan fitur BYOK. Hanya isi jika ingin mengganti key saat ini.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <BrainCircuit size={12} className="text-green-400" /> OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={settings?.openai_api_key ? "••••••••••• (sudah diset)" : "sk-..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500/50 font-mono text-sm placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <BrainCircuit size={12} className="text-purple-400" /> Google Gemini API Key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={settings?.gemini_api_key ? "••••••••••• (sudah diset)" : "AIzaSy..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500/50 font-mono text-sm placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Default AI Provider (untuk user non-BYOK)</label>
            <select
              value={settings?.ai_provider || "openai"}
              onChange={(e) => setSettings({ ...settings, ai_provider: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
            >
              <option value="openai">OpenAI (GPT-4o / mini)</option>
              <option value="gemini">Google Gemini (Flash / Pro)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Limits */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Users size={16} />
            <h4 className="text-sm font-bold uppercase tracking-wider">Pendaftaran & Akun</h4>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Batas Total User Terdaftar (Platform Limit)</label>
            <input
              type="number"
              value={settings?.registration_limit ?? 10}
              onChange={(e) => setSettings({ ...settings, registration_limit: parseInt(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
            />
            <p className="text-[10px] text-slate-500 italic flex items-start gap-1">
              <Info size={10} className="mt-0.5 shrink-0" />
              <span>Gunakan "0" untuk pendaftaran tanpa batas. Saat ini membatasi jumlah tenant yang bisa register.</span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Max Member per Akun Trial</label>
            <input
              type="number"
              value={settings?.trial_max_users ?? 1}
              onChange={(e) => setSettings({ ...settings, trial_max_users: parseInt(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Resource Limits */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <HardDrive size={16} />
            <h4 className="text-sm font-bold uppercase tracking-wider">Resource Trial Overrides</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 text-truncate">Storage Limit (GB)</label>
              <input
                type="number"
                value={settings?.trial_max_storage_gb ?? 2}
                onChange={(e) => setSettings({ ...settings, trial_max_storage_gb: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Stream Aktif</label>
              <input
                type="number"
                value={settings?.trial_max_active_streams ?? 1}
                onChange={(e) => setSettings({ ...settings, trial_max_active_streams: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 text-truncate">Respon AI per Hari</label>
            <input
              type="number"
              value={settings?.trial_max_ai_responses ?? 10}
              onChange={(e) => setSettings({ ...settings, trial_max_ai_responses: parseInt(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        </div> {/* grid */}

        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex-1">
            {error && <p className="text-xs font-medium text-rose-400">{error}</p>}
            {success && <p className="text-xs font-medium text-emerald-400">{success}</p>}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-600/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Simpan Konfigurasi</span>
          </button>
        </div>
      </form>
    </div>
  );
}
