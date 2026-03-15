"use client";

import React, { useState, useEffect, useRef } from "react";
import { Save, Key, Globe, Cpu, BrainCircuit, ShieldCheck, Check, Loader2, AlertCircle, Volume2, Plus, Trash2, Music, ToggleLeft, ToggleRight, Upload } from "lucide-react";

type Tab = "api_keys" | "ai_providers" | "stream" | "ai_defaults" | "sound_events";

const tabs = [
  { id: "api_keys" as Tab, label: "API Keys", icon: Key, color: "blue" },
  { id: "ai_providers" as Tab, label: "AI Providers", icon: BrainCircuit, color: "purple" },
  { id: "stream" as Tab, label: "Platform & Stream", icon: Globe, color: "green" },
  { id: "ai_defaults" as Tab, label: "AI Defaults", icon: Cpu, color: "orange" },
  { id: "sound_events" as Tab, label: "Sound Events", icon: Volume2, color: "pink" },
];

interface SoundEvent {
  id: string;
  event_type: string;
  keyword: string | null;
  audio_url: string;
  active: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("api_keys");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    openai_api_key: "",
    gemini_api_key: "",
    ai_provider: "openai",
    tts_provider: "openai",
    yt_channel_handle: "",
    tiktok_channel_handle: "",
    ai_name: "Loop",
    ai_persona: "",
    ai_tone_default: "friendly",
    mediamtx_host: "localhost",
    rtmp_port: 1935,
    hls_port: 8888,
    redis_url: "redis://localhost:6379",
    max_response_length: 150,
    yt_cookie: "",
    app_base_url: "http://localhost:3000",
    scheduler_api_key: "looplive-scheduler-internal-key",
    use_client_side_ai: false
  });

  const [soundEvents, setSoundEvents] = useState<SoundEvent[]>([]);
  const [newSound, setNewSound] = useState({
    event_type: "keyword",
    keyword: "",
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchSoundEvents();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings((prev: any) => ({ ...prev, ...data }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Load keys from local storage if client-side AI is enabled
  useEffect(() => {
    if (settings.use_client_side_ai) {
      const localOpenAI = localStorage.getItem("byok_openai_key");
      const localGemini = localStorage.getItem("byok_gemini_key");
      if (localOpenAI || localGemini) {
        setSettings(prev => ({
          ...prev,
          openai_api_key: localOpenAI ? `[LOCAL] ${localOpenAI.slice(-4)}` : prev.openai_api_key,
          gemini_api_key: localGemini ? `[LOCAL] ${localGemini.slice(-4)}` : prev.gemini_api_key,
        }));
      }
    }
  }, [settings.use_client_side_ai]);

  const fetchSoundEvents = async () => {
    try {
      const res = await fetch("/api/sounds");
      if (res.ok) {
        const data = await res.json();
        setSoundEvents(data);
      }
    } catch (err) {
      console.error("Failed to fetch sound events");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Filter out local keys from being sent to server
      const payload: any = { ...settings };
      if (settings.use_client_side_ai) {
          // STRICT BYOK ENFORCEMENT: Never send keys to server
          payload.openai_api_key = "";
          payload.gemini_api_key = "";
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      if (settings.use_client_side_ai) {
        // Redraw local keys with [LOCAL] prefix after save to reassure user
        const localOpenAI = localStorage.getItem("byok_openai_key");
        const localGemini = localStorage.getItem("byok_gemini_key");
        setSettings(prev => ({
          ...prev,
          openai_api_key: localOpenAI ? `[LOCAL] ${localOpenAI.slice(-4)}` : "",
          gemini_api_key: localGemini ? `[LOCAL] ${localGemini.slice(-4)}` : "",
        }));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSound = async () => {
    if (!newSound.file || (newSound.event_type === "keyword" && !newSound.keyword)) {
      alert("Please provide a file and a keyword (if applicable)");
      return;
    }

    try {
      setUploading(true);

      // 1. Upload file
      const formData = new FormData();
      formData.append("file", newSound.file);

      const uploadRes = await fetch("/api/sounds/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("File upload failed");
      const { url } = await uploadRes.json();

      // 2. Create entry in DB
      const createRes = await fetch("/api/sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: newSound.event_type,
          keyword: newSound.keyword,
          audio_url: url,
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create sound event");

      // Reset form and refresh
      setNewSound({ event_type: "keyword", keyword: "", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchSoundEvents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSound = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sound?")) return;
    try {
      const res = await fetch(`/api/sounds/${id}`, { method: "DELETE" });
      if (res.ok) fetchSoundEvents();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleToggleSound = async (id: string, active: boolean, keyword: string | null) => {
    try {
      const res = await fetch(`/api/sounds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, keyword }),
      });
      if (res.ok) fetchSoundEvents();
    } catch (err) {
      alert("Update failed");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev: any) => ({
      ...prev,
      [name]: ["rtmp_port", "hls_port", "max_response_length"].includes(name) ? parseInt(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Pengaturan</h2>
          <p className="text-slate-500 mt-1">Rapikan koneksi platform, AI, dan alur kerja live Anda di sini.</p>
        </div>
        <div className="flex items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={activeTab === "sound_events" ? fetchSoundEvents : handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-semibold transition-all shadow-lg active:scale-95 disabled:opacity-50 ${saved
                ? "bg-green-600 shadow-green-600/20 text-white"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 text-white"
              }`}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : saved ? (
              <Check size={18} />
            ) : (
              activeTab === "sound_events" ? <Loader2 size={18} /> : <Save size={18} />
            )}
            <span>{saving ? "Menyimpan..." : saved ? "Tersimpan!" : activeTab === "sound_events" ? "Muat Ulang" : "Simpan Perubahan"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tab Sidebar */}
        <div className="space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${isActive
                    ? `bg-slate-800 text-white border border-slate-700`
                    : "hover:bg-slate-900 text-slate-400 hover:text-slate-300"
                  }`}
              >
                <Icon size={20} className={isActive ? `text-white` : `text-slate-500`} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-2 space-y-6">

          {/* --- API KEYS TAB --- */}
          {activeTab === "api_keys" && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <Key size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">API Keys</h3>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 ml-2">Aktifkan Fitur BYOK</span>
                    <button 
                         onClick={() => setSettings({...settings, use_client_side_ai: !settings.use_client_side_ai})}
                         className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.use_client_side_ai ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.use_client_side_ai ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
              </div>

              {!settings.use_client_side_ai ? (
                  <div className="p-8 bg-slate-950/50 border border-slate-800 rounded-2xl text-center space-y-3">
                      <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                        <BrainCircuit size={24} />
                      </div>
                      <h4 className="text-white font-bold text-lg">Menggunakan AI Platform</h4>
                      <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                        Sistem sedang menggunakan AI bawaan (System Keys). Respon AI otomatis akan memotong kuota harian sesuai dengan paket langganan Anda.
                      </p>
                      <p className="text-xs text-slate-500 pt-2">
                        Aktifkan fitur BYOK di atas jika Anda ingin menggunakan API Key milik Anda sendiri (Unlimited AI Responses).
                      </p>
                  </div>
              ) : (
                <>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
                      <AlertCircle className="text-amber-500 shrink-0" size={18} />
                      <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Zero-Knowledge Mode On</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            API Key Anda hanya akan disimpan di browser ini (localStorage). 
                            LoopLive tidak akan menyimpan key Anda di database server. 
                            <br/>
                            <strong className="text-white">Penting:</strong> AI & TTS hanya akan berfungsi jika Anda membuka halaman "Live Management" saat streaming berlangsung.
                          </p>
                      </div>
                  </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-400">OpenAI API Key</label>
                  {settings.use_client_side_ai && <span className="text-[9px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Managed Locally</span>}
                </div>
                <input
                  type="password"
                  name="openai_api_key"
                  value={settings.openai_api_key || ""}
                  onChange={(e) => {
                      const val = e.target.value;
                      if (settings.use_client_side_ai) {
                          localStorage.setItem("byok_openai_key", val);
                          setSettings({...settings, openai_api_key: val});
                      } else {
                          handleChange(e);
                      }
                  }}
                  placeholder={settings.use_client_side_ai ? "Paste key here (Saved locally)" : "sk-..."}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-400">Google Gemini API Key</label>
                  {settings.use_client_side_ai && <span className="text-[9px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Managed Locally</span>}
                </div>
                <input
                  type="password"
                  name="gemini_api_key"
                  value={settings.gemini_api_key || ""}
                  onChange={(e) => {
                      const val = e.target.value;
                      if (settings.use_client_side_ai) {
                          localStorage.setItem("byok_gemini_key", val);
                          setSettings({...settings, gemini_api_key: val});
                      } else {
                          handleChange(e);
                      }
                  }}
                  placeholder={settings.use_client_side_ai ? "Paste key here (Saved locally)" : "AIzaSy..."}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-500 px-1 italic">
                  Get your key at{" "}
                  <a href="https://aistudio.google.com/" target="_blank" className="text-purple-400 hover:underline">aistudio.google.com</a>
                </p>
              </div>
              </>
             )}
            </div>
          )}

          {/* --- AI PROVIDERS TAB --- */}
          {activeTab === "ai_providers" && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                  <BrainCircuit size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">AI Providers</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    LLM Provider <span className="text-[10px] text-slate-600">(Chat AI)</span>
                  </label>
                  <select
                    name="ai_provider"
                    value={settings.ai_provider}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="openai">OpenAI (GPT-4o / mini)</option>
                    <option value="gemini">Google Gemini (Flash / Pro)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    TTS Provider <span className="text-[10px] text-slate-600">(Voice AI)</span>
                  </label>
                  <select
                    name="tts_provider"
                    value={settings.tts_provider}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="openai">OpenAI TTS</option>
                    <option value="gemini">Google Gemini TTS</option>
                    <option value="edge">Edge TTS (Free)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <span className="text-blue-400">💡</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Settings are saved globally. Workers will use these values to communicate with AI services.
                  Note: Updating these will take effect on the next AI interaction or worker restart.
                </p>
              </div>
            </div>
          )}

          {/* --- STREAM SETTINGS TAB --- */}
          {activeTab === "stream" && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                  <Globe size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Platform & Automation</h3>
              </div>

              <div className="flex items-start gap-3 p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10">
                <span className="text-sky-400">i</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Direct RTMP ke YouTube atau TikTok adalah alur utama yang direkomendasikan. MediaMTX di bawah ini
                  hanya diperlukan bila Anda masih ingin preview atau relay internal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">YouTube Handle</label>
                  <input
                    type="text"
                    name="yt_channel_handle"
                    value={settings.yt_channel_handle || ""}
                    onChange={handleChange}
                    placeholder="@channel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-red-500/50 transition-all font-mono text-sm placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-400">YouTube Cookie (for Chat Polling)</label>
                  <textarea
                    name="yt_cookie"
                    value={settings.yt_cookie || ""}
                    onChange={handleChange}
                    placeholder="PASTE_COOKIE_HERE"
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-red-500/50 transition-all font-mono text-[10px] placeholder:text-slate-600 resize-none"
                  />
                  <p className="text-[10px] text-slate-500 px-1 italic">
                    Cookies are required for restricted chats. Use a browser extension to export Netscape format or RAW cookies.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">App Base URL (Scheduler Worker)</label>
                  <input
                    type="text"
                    name="app_base_url"
                    value={settings.app_base_url || ""}
                    onChange={handleChange}
                    placeholder="http://localhost:3000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-red-500/50 transition-all font-mono text-xs placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-500 px-1 italic">
                    URL aplikasi Next.js yang dipakai scheduler untuk memanggil start/stop session.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Scheduler API Key</label>
                  <input
                    type="password"
                    name="scheduler_api_key"
                    value={settings.scheduler_api_key || ""}
                    onChange={handleChange}
                    placeholder="looplive-scheduler-internal-key"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-red-500/50 transition-all font-mono text-xs placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-500 px-1 italic">
                    Kunci internal untuk worker scheduler otomatis.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">TikTok Handle</label>
                  <input
                    type="text"
                    name="tiktok_channel_handle"
                    value={settings.tiktok_channel_handle || ""}
                    onChange={handleChange}
                    placeholder="@channel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-pink-500/50 transition-all font-mono text-sm placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <label className="text-sm font-medium text-slate-400">Redis URL</label>
                  <input
                    type="text"
                    name="redis_url"
                    value={settings.redis_url}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-5 space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">Advanced Internal Relay</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Optional only. Isi ini jika Anda masih menggunakan MediaMTX untuk preview atau distribusi internal.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-400">MediaMTX Host</label>
                    <input
                      type="text"
                      name="mediamtx_host"
                      value={settings.mediamtx_host}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">RTMP Port</label>
                    <input
                      type="number"
                      name="rtmp_port"
                      value={settings.rtmp_port}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">HLS Port</label>
                    <input
                      type="number"
                      name="hls_port"
                      value={settings.hls_port}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- AI DEFAULTS TAB --- */}
          {activeTab === "ai_defaults" && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                  <Cpu size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">AI Identity &amp; Persona</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">AI Name</label>
                  <input
                    type="text"
                    name="ai_name"
                    value={settings.ai_name}
                    onChange={handleChange}
                    placeholder="e.g. Loop"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Default AI Tone</label>
                  <select
                    name="ai_tone_default"
                    value={settings.ai_tone_default}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="friendly">Friendly &amp; Welcoming</option>
                    <option value="energetic">Energetic &amp; Hype</option>
                    <option value="professional">Professional &amp; Informative</option>
                    <option value="funny">Funny &amp; Sarcastic</option>
                    <option value="chill">Chill &amp; Relaxed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Global System Persona (Base Prompt)</label>
                <textarea
                  name="ai_persona"
                  value={settings.ai_persona || ""}
                  onChange={handleChange}
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all text-sm resize-none placeholder:text-slate-700"
                  placeholder="Describe your AI's personality, rules, and behavior..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Max Response Length (Tokens)</label>
                <input
                  type="number"
                  name="max_response_length"
                  value={settings.max_response_length}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all"
                />
                <p className="text-[10px] text-slate-500 px-1">Lower = faster responses. Recommended: 80-200.</p>
              </div>
            </div>
          )}

          {/* --- SOUND EVENTS TAB --- */}
          {activeTab === "sound_events" && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20">
                    <Volume2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Add New Sound Event</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Event Type</label>
                    <select
                      value={newSound.event_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSound((prev: any) => ({ ...prev, event_type: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-pink-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="keyword">Chat Keyword (e.g. "hai")</option>
                      <option value="join">Viewer Join Stream</option>
                    </select>
                  </div>
                  {newSound.event_type === "keyword" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Keyword</label>
                      <input
                        type="text"
                        value={newSound.keyword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSound((prev: any) => ({ ...prev, keyword: e.target.value }))}
                        placeholder="hai"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-pink-500/50 transition-all font-mono text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Audio File (MP3/WAV)</label>
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSound((prev: any) => ({ ...prev, file: e.target.files?.[0] || null }))}
                      className="hidden"
                      accept="audio/*"
                    />
                    <div className="w-full bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-pink-500/50 transition-all">
                      <div className="h-12 w-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-pink-400">
                        {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                      </div>
                      <p className="text-sm text-slate-500 font-medium tracking-tight">
                        {newSound.file ? newSound.file.name : "Click to upload audio file"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddSound}
                  disabled={uploading || (!newSound.file)}
                  className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-pink-600/20"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span>{uploading ? "Uploading..." : "Add Sound Trigger"}</span>
                </button>
              </div>

              {/* Sound List */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
                <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">Configured Sounds</h4>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg font-bold">{soundEvents.length} Events</span>
                </div>
                <div className="divide-y divide-slate-800">
                  {soundEvents.length === 0 ? (
                    <div className="p-12 text-center">
                      <Music className="mx-auto text-slate-700 mb-3" size={32} />
                      <p className="text-slate-500 text-sm">No custom sounds configured yet.</p>
                    </div>
                  ) : (
                    soundEvents.map((sound: SoundEvent) => (
                      <div key={sound.id} className="p-6 flex items-center justify-between hover:bg-slate-800/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                            <Volume2 size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium text-sm">
                                {sound.event_type === "keyword" ? `Keyword: "${sound.keyword}"` : "Event: Viewer Join"}
                              </span>
                              {!sound.active && (
                                <span className="text-[9px] bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded border border-slate-800 font-bold uppercase tracking-widest">Disabled</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{sound.audio_url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSound(sound.id, !sound.active, sound.keyword)}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${sound.active ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-600 hover:bg-slate-700'}`}
                          >
                            {sound.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                          <button
                            onClick={() => handleDeleteSound(sound.id)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>

  );
}
