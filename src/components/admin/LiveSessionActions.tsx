"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, StopCircle, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface LiveSessionActionsProps {
  sessionId: string;
  initialStatus: string;
  sessionTitle?: string;
}

export default function LiveSessionActions({ sessionId, initialStatus, sessionTitle }: LiveSessionActionsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const router = useRouter();
  const { success, error: toastError } = useToast();

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
        success(action === "start" ? "Stream Dimulai" : "Stream Dihentikan", `Sesi live berhasil ${action === "start" ? "dimulai" : "dihentikan"}.`);
        router.refresh();
      } else {
        toastError("Gagal Eksekusi", data.error || "Gagal menjalankan aksi stream.");
      }
    } catch (error) {
      toastError("Kesalahan Jaringan", "Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/live/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        success("Sesi Dihapus", "Sesi live berhasil dihapus selamanya.");
        router.refresh();
      } else {
        const data = await res.json();
        toastError("Gagal Menghapus", data.error || "Gagal menghapus sesi live.");
      }
    } catch (error) {
      toastError("Kesalahan Jaringan", "Gagal menghubungi server.");
      throw error;
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
        onClick={(e) => {
           e.preventDefault();
           e.stopPropagation();
           setIsConfirmOpen(true);
        }}
        disabled={loading || status === 'LIVE'}
        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-30 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
        title={status === 'LIVE' ? "Cannot delete active stream" : "Delete Session"}
      >
        <Trash2 size={18} />
      </button>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Sesi Live?"
        message={`Apakah Anda yakin ingin menghapus sesi "${sessionTitle || 'ini'}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Sesi"
      />
    </div>
  );
}

