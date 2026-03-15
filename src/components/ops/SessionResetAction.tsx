"use client";

import React, { useState } from "react";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
    sessionId: string;
    title: string;
    status: string;
};

export default function SessionResetAction({ sessionId, title, status }: Props) {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const handleReset = async () => {
        if (!confirm(`Are you sure you want to FORCE RESET "${title}"? This will kill the streaming worker immediately.`)) return;
        
        setLoading(true);
        setError("");
        
        try {
            const res = await fetch(`/api/ops/sessions/${sessionId}/reset`, { method: "POST" });
            if (res.ok) {
                setDone(true);
                window.location.reload(); // Refresh to show new state
            } else {
                const data = await res.json();
                setError(data.error || "Failed to reset");
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    if (status !== "LIVE" && !done) return null;

    return (
        <div className="flex items-center gap-2">
            {error && <span className="text-[10px] text-rose-500 font-bold uppercase">{error}</span>}
            <button
                onClick={handleReset}
                disabled={loading || done}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    done 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white'
                }`}
            >
                {loading ? (
                    <Loader2 className="animate-spin" size={12} />
                ) : done ? (
                    <CheckCircle2 size={12} />
                ) : (
                    <RefreshCw size={12} />
                )}
                {done ? "Reset Done" : "Force Reset"}
            </button>
        </div>
    );
}
