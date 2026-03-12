"use client";

import React, { useState } from "react";
import { Play, StopCircle, RefreshCw, Youtube } from "lucide-react";
import { useRouter } from "next/navigation";

interface SessionControlsProps {
  sessionId: string;
  initialStatus: string;
  initialYoutubeId?: string | null;
}

export default function SessionControls({ sessionId, initialStatus, initialYoutubeId }: SessionControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [youtubeId, setYoutubeId] = useState(initialYoutubeId || "");
  const [showYtInput, setShowYtInput] = useState(false);
  const router = useRouter();

  const handleAction = async (action: "start" | "stop") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/live/${sessionId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus(data.status || (action === "start" ? "LIVE" : "STOPPED"));
        router.refresh();
      } else {
        alert(`Error: ${data.error || "Failed to execute action"}`);
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeIdUpdate = async () => {
    if (!youtubeId.trim()) return;
    
    setYtLoading(true);
    try {
      const res = await fetch(`/api/live/${sessionId}/youtube-id`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_video_id: youtubeId.trim() }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`YouTube ID updated! Poller restarted: ${data.poller_restarted ? "Yes" : "No"}`);
        setShowYtInput(false);
        router.refresh();
      } else {
        alert(`Error: ${data.error || "Failed to update YouTube ID"}`);
      }
    } catch (error) {
      console.error("YouTube ID update failed:", error);
      alert("Network error occurred");
    } finally {
      setYtLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* YouTube ID Quick Update */}
      {status === "LIVE" && (
        <div className="p-4 bg-slate-900/80 border border-blue-500/30 rounded-2xl">
          <button
            onClick={() => setShowYtInput(!showYtInput)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Youtube className="text-red-500" size={18} />
              <span className="text-sm font-medium text-slate-300">Current YouTube ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-400">{initialYoutubeId || "Not set"}</span>
              <RefreshCw size={14} className={`text-slate-400 transition-transform ${showYtInput ? "rotate-180" : ""}`} />
            </div>
          </button>
          
          {showYtInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={youtubeId}
                onChange={(e) => setYoutubeId(e.target.value)}
                placeholder="Enter new YouTube Video ID or URL"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleYoutubeIdUpdate}
                disabled={ytLoading || !youtubeId.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ytLoading ? <RefreshCw size={16} className="animate-spin" /> : "Update"}
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Change YouTube Video ID while LIVE to read comments from a different stream
          </p>
        </div>
      )}

      {/* Start/Stop Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAction("start")}
          disabled={status === "LIVE" || loading}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 ${
            status === "LIVE" || loading
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-500 text-white shadow-green-600/20"
          }`}
        >
          <>
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} />}
            <span>Start Livestream</span>
          </>
        </button>
        <button
          onClick={() => handleAction("stop")}
          disabled={status !== "LIVE" || loading}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 ${
            status !== "LIVE" || loading
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20"
          }`}
        >
          <>
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <StopCircle size={20} />}
            <span>Terminate Stream</span>
          </>
        </button>
      </div>
    </div>
  );
}
