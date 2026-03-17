"use client";

import React, { useState, useEffect } from "react";
import { X, Radio, Plus, Loader2, FileVideo } from "lucide-react";
import { useRouter } from "next/navigation";

const AI_TONES = [
  { value: "helpful", label: "🤝 Ramah & Membantu" },
  { value: "educational", label: "📚 Edukatif & Detail" },
  { value: "professional", label: "💼 Profesional" },
  { value: "energetic", label: "⚡ Enerjik & Seru" },
];

export default function CreateSessionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingVideos, setFetchingVideos] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    video_id: "",
    ai_tone: "helpful",
    target_rtmp_url: "",
    stream_key: "",
    loop_mode: "infinite",
    loop_count: "1",
    context_text: "",
    youtube_video_id: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  const fetchVideos = async () => {
    try {
      setFetchingVideos(true);
      const res = await fetch("/api/videos");
      if (res.ok) {
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingVideos(false);
    }
  };

  const applyPlatformPreset = (platform: "youtube" | "tiktok") => {
    if (platform === "youtube") {
      setFormData((p) => ({
        ...p,
        target_rtmp_url: "rtmp://a.rtmp.youtube.com/live2",
      }));
    } else if (platform === "tiktok") {
      setFormData((p) => ({
        ...p,
        target_rtmp_url: "rtmp://open-rtmp.tiktok.com/stage/",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onClose();
        router.push("/admin/live");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Gagal membuat sesi live");
      }
    } catch (err) {
      setError("Kesalahan koneksi server");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 my-4 md:my-8">

        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Radio size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base md:text-lg tracking-tight">Buat Sesi Live</h3>
              <p className="text-slate-500 text-[10px] md:text-xs">Siapkan live Anda dalam beberapa langkah</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-5 md:space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Info Dasar</h4>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-slate-400">Judul Sesi *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="Contoh: Live Musik Santai Malam Ini"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-slate-400">Video Utama *</label>
              {fetchingVideos ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs md:text-sm px-1 py-1">
                  <Loader2 size={14} className="animate-spin" /> Memuat video...
                </div>
              ) : videos.length === 0 ? (
                <div className="flex items-center gap-2 text-orange-400 text-xs md:text-sm bg-orange-500/10 border border-orange-500/20 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3">
                  <FileVideo size={14} /> Belum ada video. Tambahkan video lebih dulu.
                </div>
              ) : (
                <select
                  required
                  value={formData.video_id}
                  onChange={e => setFormData(p => ({ ...p, video_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-sm"
                >
                  <option value="">-- Pilih video --</option>
                  <>
                    {videos.map(v => (
                      <option key={v.id} value={v.id}>{v.filename}</option>
                    ))}
                  </>
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-slate-400">Gaya AI</label>
              <div className="grid grid-cols-2 gap-2">
                {AI_TONES.map(tone => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, ai_tone: tone.value }))}
                    className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium text-left transition-all ${formData.ai_tone === tone.value
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

          <div className="h-px bg-slate-800 my-1 md:my-2" />

          {/* Section 2: Platform Destination */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tujuan Live</h4>

            <div className="flex flex-wrap gap-2 px-1">
              <button
                type="button"
                onClick={() => applyPlatformPreset("youtube")}
                className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-red-300 transition hover:bg-red-500/20"
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => applyPlatformPreset("tiktok")}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 transition hover:bg-cyan-400/20"
              >
                TikTok
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-medium text-slate-400">Alamat RTMP</label>
                <input
                  type="text"
                  value={formData.target_rtmp_url}
                  onChange={e => setFormData(p => ({ ...p, target_rtmp_url: e.target.value }))}
                  placeholder="Contoh: rtmp://a.rtmp.youtube.com/live2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-[10px] md:text-xs placeholder:text-slate-600"
                />
                <p className="text-[9px] md:text-[10px] text-slate-500 px-1 italic">
                  Kosongkan hanya jika Anda ingin memakai preview atau relay internal.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-medium text-slate-400">Kunci Stream</label>
                <input
                  type="password"
                  value={formData.stream_key}
                  onChange={e => setFormData(p => ({ ...p, stream_key: e.target.value }))}
                  placeholder="Tempel stream key di sini"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-[10px] md:text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2 px-1">
              <label className="text-[10px] md:text-[11px] font-medium text-red-400/80">Video ID YouTube untuk Chat</label>
              <input
                type="text"
                value={formData.youtube_video_id}
                onChange={e => setFormData(p => ({ ...p, youtube_video_id: e.target.value }))}
                placeholder="Opsional: isi manual jika perlu"
                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500/30 transition-all font-mono text-[10px] md:text-xs placeholder:text-slate-600"
              />
              <p className="text-[8px] md:text-[9px] text-slate-500 leading-relaxed italic">
                Sistem akan auto-detect dari handle YouTube jika dikosongkan.
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-800 my-1 md:my-2" />

          <div className="space-y-3 md:space-y-4">
            <h4 className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Mode Loop</h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, loop_mode: "infinite" }))}
                className={`px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-2xl text-[11px] md:text-sm font-medium text-left transition-all ${
                  formData.loop_mode === "infinite"
                    ? "bg-cyan-600/20 border border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800 border border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700"
                }`}
              >
                Tanpa batas
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, loop_mode: "count" }))}
                className={`px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-2xl text-[11px] md:text-sm font-medium text-left transition-all ${
                  formData.loop_mode === "count"
                    ? "bg-cyan-600/20 border border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800 border border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700"
                }`}
              >
                Per Jumlah
              </button>
            </div>

            {formData.loop_mode === "count" && (
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-medium text-slate-400">Total Pemutaran</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.loop_count}
                  onChange={(e) => setFormData((p) => ({ ...p, loop_count: e.target.value }))}
                  placeholder="Contoh: 2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all text-sm placeholder:text-slate-600"
                />
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800 my-1 md:my-2" />

          {/* Section 3: Context */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium text-slate-400">Konteks Live untuk AI</label>
            <textarea
              rows={2}
              value={formData.context_text}
              onChange={e => setFormData(p => ({ ...p, context_text: e.target.value }))}
              placeholder="Ceritakan singkat live ini tentang apa..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all text-sm resize-none placeholder:text-slate-600"
            />
          </div>


          {error && <p className="text-red-400 text-xs md:text-sm">{"⚠️ "}{error}</p>}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-2">
            <button type="button" onClick={onClose} className="order-2 sm:order-1 flex-1 px-5 py-3 rounded-xl md:rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all font-medium text-sm">
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="order-1 sm:order-2 flex-[1.5] flex items-center justify-center gap-2 px-5 py-3 rounded-xl md:rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-600/20 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 text-sm"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {loading ? "Membuat..." : "Buat Sesi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
