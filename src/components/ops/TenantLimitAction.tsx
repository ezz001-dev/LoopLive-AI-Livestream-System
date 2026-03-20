"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Check, X, Edit2 } from "lucide-react";

type TenantLimitActionProps = {
  tenantId: string;
  currentOverride: number | null;
  planLimit: number;
};

export default function TenantLimitAction({
  tenantId,
  currentOverride,
  planLimit,
}: TenantLimitActionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentOverride?.toString() || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/ops/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_stream_minutes_override: value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update limit");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error: any) {
      window.alert(error.message || "Failed to update limit");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${planLimit} (plan)`}
          className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-cyan-500 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="text-slate-500 hover:text-slate-400"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const effectiveLimit = currentOverride ?? planLimit;

  return (
    <div className="flex items-center justify-end gap-2 group">
      <div className="flex flex-col items-end">
        <span className={`text-[11px] font-bold ${currentOverride !== null ? 'text-amber-400' : 'text-slate-400'}`}>
          {effectiveLimit === -1 ? 'Unlimited' : `${effectiveLimit}m`}
        </span>
        {currentOverride !== null && (
          <span className="text-[9px] text-slate-500 italic lowercase tracking-tight">override active</span>
        )}
      </div>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-cyan-400 transition-all border border-slate-800 hover:border-cyan-500/30 p-1.5 rounded-lg bg-slate-900/50"
      >
        <Edit2 size={12} />
      </button>
    </div>
  );
}
