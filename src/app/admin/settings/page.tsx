"use client";

import React, { useState, useEffect } from "react";
import { Save, Key, Globe, Cpu, BrainCircuit, ShieldCheck, Check, Loader2, AlertCircle } from "lucide-react";

type Tab = "api_keys" | "ai_providers" | "stream" | "ai_defaults";

const tabs = [
  { id: "api_keys" as Tab, label: "API Keys", icon: Key, color: "blue" },
  { id: "ai_providers" as Tab, label: "AI Providers", icon: BrainCircuit, color: "purple" },
  { id: "stream" as Tab, label: "Stream Settings", icon: Globe, color: "green" },
  { id: "ai_defaults" as Tab, label: "AI Defaults", icon: Cpu, color: "orange" },
];

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
    max_response_length: 150
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(prev => ({
        ...prev,
        ...data
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
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
          <h2 className="text-3xl font-bold text-white tracking-tight">Settings</h2>
          <p className="text-slate-500 mt-1">Manage your system configuration and AI personality.</p>
        </div>
        <div className="flex items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-semibold transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
              saved
                ? "bg-green-600 shadow-green-600/20 text-white"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 text-white"
            }`}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : saved ? (
              <Check size={18} />
            ) : (
              <Save size={18} />
            )}
            <span>{saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}</span>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
                  isActive
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
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <Key size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">API Keys</h3>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">OpenAI API Key</label>
                <input 
                  type="password" 
                  name="openai_api_key"
                  value={settings.openai_api_key || ""} 
                  onChange={handleChange}
                  placeholder="sk-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm placeholder:text-slate-600" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Google Gemini API Key</label>
                <input 
                  type="password" 
                  name="gemini_api_key"
                  value={settings.gemini_api_key || ""} 
                  onChange={handleChange}
                  placeholder="AIzaSy..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm placeholder:text-slate-600" 
                />
                <p className="text-[10px] text-slate-500 px-1 italic">
                  Get your key at{" "}
                  <a href="https://aistudio.google.com/" target="_blank" className="text-purple-400 hover:underline">aistudio.google.com</a>
                </p>
              </div>
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
                <h3 className="text-xl font-bold text-white">Channel & Network</h3>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">MediaMTX Host</label>
                  <input 
                    type="text" 
                    name="mediamtx_host"
                    value={settings.mediamtx_host} 
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all font-mono text-sm" 
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

              <div className="grid grid-cols-2 gap-5 pt-2">
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

        </div>
      </div>
    </div>
  );
}
