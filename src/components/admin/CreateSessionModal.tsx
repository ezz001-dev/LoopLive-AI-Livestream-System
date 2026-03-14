"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Loader2, Radio, FileVideo } from "lucide-react";
import { useRouter } from "next/navigation";

interface Video {
  id: string;
  filename: string;
  file_type: string;
  storage_provider?: string;
}

interface CreateSessionModalProps {
  onClose: () => void;
}

const AI_TONES = [
  { value: "friendly", label: "Friendly & Welcoming" },
  { value: "energetic", label: "Energetic & Hype" },
  { value: "professional", label: "Professional & Informative" },
  { value: "funny", label: "Funny & Sarcastic" },
  { value: "chill", label: "Chill & Relaxed" },
];

export default function CreateSessionModal({ onClose }: CreateSessionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingVideos, setFetchingVideos] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    video_id: "",
    context_text: "",
    ai_tone: "friendly",
    youtube_video_id: "",
    target_rtmp_url: "",
    stream_key: "",
  });
  const [error, setError] = useState("");

  const applyPlatformPreset = (platform: "youtube" | "tiktok") => {
    setFormData((prev) => ({
      ...prev,
      target_rtmp_url:
        platform === "youtube"
          ? "rtmp://a.rtmp.youtube.com/live2"
          : "rtmp://push-rtmp-global.tiktok.com/live/",
    }));
  };

  useEffect(() => {
    fetch("/api/videos")
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setVideos(items);
        setFetchingVideos(false);
      })
      .catch(() => setFetchingVideos(false));

    // Fetch default settings for initial tone
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.ai_tone_default) {
          setFormData(prev => ({ ...prev, ai_tone: data.ai_tone_default }));
        }
      })
      .catch(err => console.error("Failed to fetch default settings", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.video_id) {
      setError("Session name and video are required.");
      return;
    }

    // Basic RTMP validation
    if (formData.target_rtmp_url && !formData.target_rtmp_url.startsWith("rtmp")) {
      setError("RTMP Server URL must start with 'rtmp://' or 'rtmps://'");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");

      router.push(`/admin/live/${data.live_id}`);
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 my-8">

        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Radio size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">New Live Session</h3>
              <p className="text-slate-500 text-xs">Configure your AI livestream</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Basic Configuration</h4>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Session Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Gaming Night with AI"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Loop Video *</label>
              {fetchingVideos ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm px-1 py-1">
                  <Loader2 size={16} className="animate-spin" /> Loading videos...
                </div>
              ) : videos.length === 0 ? (
                <div className="flex items-center gap-2 text-orange-400 text-sm bg-orange-500/10 border border-orange-500/20 rounded-2xl px-5 py-3">
                  <FileVideo size={16} /> No videos found. Please upload a video first.
                </div>
              ) : (
                <select
                  required
                  value={formData.video_id}
                  onChange={e => setFormData(p => ({ ...p, video_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Select a video --</option>
                  <>
                    {videos.map(v => (
                      <option key={v.id} value={v.id}>{v.filename}</option>
                    ))}
                  </>
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">AI Personality Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {AI_TONES.map(tone => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, ai_tone: tone.value }))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${formData.ai_tone === tone.value
                      ? "bg-cyan-600/20 border border-cyan-500/40 text-cyan-300"
                      : "bg-slate-800 border border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700"
                      }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800 my-2" />

          {/* Section 2: Platform Destination */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Platform Destination (Recommended)</h4>

            <div className="flex flex-wrap gap-2 px-1">
              <button
                type="button"
                onClick={() => applyPlatformPreset("youtube")}
                className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-300 transition hover:bg-red-500/20"
              >
                Use YouTube RTMP
              </button>
              <button
                type="button"
                onClick={() => applyPlatformPreset("tiktok")}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 transition hover:bg-cyan-400/20"
              >
                Use TikTok RTMP
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Target RTMP URL</label>
                <input
                  type="text"
                  value={formData.target_rtmp_url}
                  onChange={e => setFormData(p => ({ ...p, target_rtmp_url: e.target.value }))}
                  placeholder="e.g., rtmp://a.rtmp.youtube.com/live2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-xs placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-500 px-1">
                  Kosongkan hanya jika Anda memang ingin fallback ke MediaMTX internal untuk preview atau relay.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Stream Key</label>
                <input
                  type="password"
                  value={formData.stream_key}
                  onChange={e => setFormData(p => ({ ...p, stream_key: e.target.value }))}
                  placeholder="Paste your Stream Key here"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2 px-1">
              <label className="text-[11px] font-medium text-red-400/80">YouTube Chat Monitoring Video ID</label>
              <input
                type="text"
                value={formData.youtube_video_id}
                onChange={e => setFormData(p => ({ ...p, youtube_video_id: e.target.value }))}
                placeholder="Override Video ID (Optional)"
                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500/30 transition-all font-mono text-xs placeholder:text-slate-600"
              />
              <p className="text-[9px] text-slate-500 leading-relaxed">
                Kosongkan jika ingin sistem auto-detect dari handle YouTube di Settings. Field ini hanya untuk chat polling.
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-800 my-2" />

          {/* Section 3: Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Stream Context (AI Knowledge)</label>
            <textarea
              rows={2}
              value={formData.context_text}
              onChange={e => setFormData(p => ({ ...p, context_text: e.target.value }))}
              placeholder="Tell the AI what this stream is about..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all text-sm resize-none placeholder:text-slate-600"
            />
          </div>


          {error && <p className="text-red-400 text-sm">{"⚠️ "}{error}</p>}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-5 py-3 rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-600/20 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {loading ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
