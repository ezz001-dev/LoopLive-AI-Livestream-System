"use client";

import React, { useState } from "react";
import { Save, Key, Globe, Cpu, BrainCircuit, ShieldCheck, Check } from "lucide-react";

type Tab = "api_keys" | "ai_providers" | "stream" | "ai_defaults";

const tabs = [
  { id: "api_keys" as Tab, label: "API Keys", icon: Key, color: "blue" },
  { id: "ai_providers" as Tab, label: "AI Providers", icon: BrainCircuit, color: "purple" },
  { id: "stream" as Tab, label: "Stream Settings", icon: Globe, color: "green" },
  { id: "ai_defaults" as Tab, label: "AI Defaults", icon: Cpu, color: "orange" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("api_keys");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Settings</h2>
          <p className="text-slate-500 mt-1">Manage your system configuration and AI personality.</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-semibold transition-all shadow-lg active:scale-95 ${
            saved
              ? "bg-green-600 shadow-green-600/20 text-white"
              : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 text-white"
          }`}
        >
          <>{saved ? <Check size={18} /> : <Save size={18} />}</>
          <span>{saved ? "Saved!" : "Save Changes"}</span>
        </button>
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
                    ? `bg-${tab.color}-600/10 text-${tab.color}-400 border border-${tab.color}-500/20`
                    : "hover:bg-slate-900 text-slate-400 hover:text-slate-300"
                }`}
              >
                <Icon size={20} />
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
                <div className="relative">
                  <input type="password" defaultValue="sk-proj-placeholder" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm pr-24" />
                  <div className="absolute inset-y-0 right-4 flex items-center">
                    <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded-md border border-green-500/20 flex items-center gap-1">
                      <ShieldCheck size={10} />
                      <span>Valid</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Google Gemini API Key</label>
                <div className="relative">
                  <input type="password" defaultValue="" placeholder="AIzaSy..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm pr-24 placeholder:text-slate-600" />
                  <div className="absolute inset-y-0 right-4 flex items-center">
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded-md border border-slate-700">Not Set</span>
                  </div>
                </div>
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
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer">
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="openai_gpt4o">OpenAI (GPT-4o)</option>
                    <option value="gemini_flash">Google Gemini 1.5 Flash</option>
                    <option value="gemini_pro">Google Gemini 1.5 Pro</option>
                    <option value="gemini_2">Google Gemini 2.0 Flash</option>
                  </select>
                  <p className="text-[10px] text-slate-500 px-1">
                    Set <code className="text-blue-300">AI_PROVIDER</code> in .env and restart worker.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    TTS Provider <span className="text-[10px] text-slate-600">(Voice AI)</span>
                  </label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer">
                    <option value="openai">OpenAI TTS (tts-1)</option>
                    <option value="openai_hd">OpenAI TTS HD (tts-1-hd)</option>
                    <option value="gemini">Google Gemini TTS</option>
                  </select>
                  <p className="text-[10px] text-slate-500 px-1">
                    Set <code className="text-blue-300">TTS_PROVIDER</code> in .env and restart worker.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <span className="text-blue-400">💡</span>
                <p className="text-xs text-slate-400">
                  To switch providers, update{" "}
                  <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">AI_PROVIDER</code> or{" "}
                  <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">TTS_PROVIDER</code> in your{" "}
                  <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">.env</code> file, then restart the ai-worker and tts-worker processes.
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
                <h3 className="text-xl font-bold text-white">Stream Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">MediaMTX Host</label>
                  <input type="text" defaultValue="localhost" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">RTMP Port</label>
                  <input type="number" defaultValue="1935" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">HLS Port</label>
                  <input type="number" defaultValue="8888" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Redis URL</label>
                  <input type="text" defaultValue="redis://localhost:6379" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all font-mono text-sm" />
                </div>
              </div>

              {/* YouTube Auto-Detect Section */}
              <div className="pt-2 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <span className="text-red-400 text-xs font-bold">▶</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">YouTube Live Auto-Detect</h4>
                  <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 font-bold">No API Key Required</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    YouTube Channel Handle
                  </label>
                  <input
                    type="text"
                    placeholder="@namakanal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-red-500/50 transition-all font-mono text-sm placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-500 px-1">
                    Set <code className="text-red-300">YT_CHANNEL_HANDLE</code> di <code className="text-slate-400">.env</code> — sistem akan auto-detect Video ID aktif saat GO LIVE diklik.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <span className="text-red-400 mt-0.5">🔴</span>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-300">Cara kerja Auto-Detect</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Saat GO LIVE diklik, sistem fetch <code className="text-red-300">youtube.com/@handle/live</code> untuk mendapatkan Video ID livestream aktif secara otomatis. Tidak perlu input manual setiap sesi.
                    </p>
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
                <h3 className="text-xl font-bold text-white">AI Identity &amp; Defaults</h3>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Global Default Tone</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all appearance-none cursor-pointer">
                  <option value="friendly">Friendly &amp; Welcoming</option>
                  <option value="energetic">Energetic &amp; Hype</option>
                  <option value="professional">Professional &amp; Informative</option>
                  <option value="funny">Funny &amp; Sarcastic</option>
                  <option value="chill">Chill &amp; Relaxed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">AI Name / Persona</label>
                <input type="text" defaultValue="Loop" placeholder="Give your AI a name..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-slate-600" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Default System Prompt (Base)</label>
                <textarea
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all text-sm resize-none"
                  defaultValue="You are an AI Livestreamer named Loop. Respond to followers in a way that is engaging and keeps the conversation flowing. Always be helpful and never break character. Keep responses short and punchy for a live audience."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Max Response Length (tokens)</label>
                <input type="number" defaultValue="150" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all" />
                <p className="text-[10px] text-slate-500 px-1">Lower = faster &amp; shorter response. Range: 50-500.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
