"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  type: ToastType;
  message: string;
  description?: string;
  onClose: () => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; text: string; iconColor: string }> = {
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    text: "text-emerald-50",
    iconColor: "text-emerald-400",
    icon: <CheckCircle2 size={20} />,
  },
  error: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/50",
    text: "text-rose-50",
    iconColor: "text-rose-400",
    icon: <AlertCircle size={20} />,
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    text: "text-blue-50",
    iconColor: "text-blue-400",
    icon: <Info size={20} />,
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/50",
    text: "text-amber-50",
    iconColor: "text-amber-400",
    icon: <AlertTriangle size={20} />,
  },
};

export default function Toast({ type, message, description, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const style = toastStyles[type];

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`
        pointer-events-auto
        group
        relative
        flex
        w-80
        flex-col
        rounded-2xl
        border
        ${style.border}
        ${style.bg}
        p-4
        shadow-2xl
        backdrop-blur-md
        transition-all
        duration-300
        ${isExiting ? "translate-x-full opacity-0 scale-95" : "translate-x-0 opacity-100 scale-100 animate-in slide-in-from-right-8 fade-in duration-300"}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`${style.iconColor} mt-0.5 shrink-0 transition-transform group-hover:scale-110 duration-300`}>
          {style.icon}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className={`text-sm font-bold tracking-tight ${style.text}`}>{message}</p>
          {description && <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">{description}</p>}
        </div>
        <button
          onClick={handleClose}
          className="ml-2 shrink-0 rounded-lg p-1 text-slate-500 transition-all hover:bg-slate-500/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden rounded-b-2xl opacity-30">
        <div 
           className={`h-full ${style.iconColor.replace('text-', 'bg-')} animate-progress`}
           style={{ animationDuration: '5s', animationTimingFunction: 'linear' }}
        />
      </div>
    </div>
  );
}
