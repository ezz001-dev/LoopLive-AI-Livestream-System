"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, StopCircle, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface LiveSessionActionsProps {
  sessionId: string;
  initialStatus: string;
}

export default function LiveSessionActions({ sessionId, initialStatus }: LiveSessionActionsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (e: React.MouseEvent, action: "start" | "stop") => {
    e.preventDefault();
    e.stopPropagation();
    
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/live/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to delete session"}`);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {status === 'LIVE' ? (
        <button 
          onClick={(e) => handleAction(e, "stop")}
          disabled={loading}
          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50" 
          title="Stop Stream"
        >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <StopCircle size={18} />}
        </button>
      ) : (
        <button 
          onClick={(e) => handleAction(e, "start")}
          disabled={loading}
          className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-50" 
          title="Start Stream"
        >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
        </button>
      )}

      <Link 
        href={`/admin/live/${sessionId}`}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition-colors"
        title="Settings"
      >
        <Settings2 size={18} />
      </Link>

      <button 
        onClick={handleDelete}
        disabled={loading || status === 'LIVE'}
        className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={status === 'LIVE' ? "Cannot delete active stream" : "Delete Session"}
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

