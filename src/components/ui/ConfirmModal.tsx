"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setIsExiting(false);
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Don't render if not mounted (SSR check) or not open and not exiting
  if (!mounted || (!isOpen && !isExiting)) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error("Confirm action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 300);
  };

  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="text-rose-400" size={24} />,
      btn: "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20",
      border: "border-rose-500/20",
      glow: "shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)]",
    },
    warning: {
      icon: <AlertTriangle className="text-amber-400" size={24} />,
      btn: "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20",
      border: "border-amber-500/20",
      glow: "shadow-[0_0_40px_-15px_rgba(245,158,11,0.3)]",
    },
    info: {
      icon: <AlertTriangle className="text-blue-400" size={24} />,
      btn: "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20",
      border: "border-blue-500/20",
      glow: "shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]",
    },
  };

  const style = variantStyles[variant];

  const modalContent = (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isExiting ? "opacity-0" : "opacity-100"}`}>
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
        onClick={loading ? undefined : handleClose} 
      />
      
      <div className={`
        relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl transition-all duration-300
        ${style.glow} ${style.border}
        ${isExiting ? "scale-95 translate-y-4" : "scale-100 translate-y-0 animate-in zoom-in-95 slide-in-from-bottom-4"}
      `}>
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute right-6 top-6 rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-800 hover:text-white disabled:opacity-0"
        >
          <X size={18} />
        </button>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950/50 border border-slate-800">
          {style.icon}
        </div>

        <h3 className="mb-2 text-xl font-black tracking-tight text-white">{title}</h3>
        <p className="mb-8 text-sm leading-relaxed text-slate-400">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-800 bg-slate-800/50 py-3.5 text-sm font-bold text-slate-400 transition-all hover:bg-slate-800 hover:text-white active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-[1.5] flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${style.btn}`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>{loading ? "Processing..." : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
