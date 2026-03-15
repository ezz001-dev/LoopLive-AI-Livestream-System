"use client";

import React from "react";
import { useRouter } from "next/navigation";

type TenantStatusActionsProps = {
  tenantId: string;
  tenantName: string;
  status: string;
};

export default function TenantStatusActions({
  tenantId,
  tenantName,
  status,
}: TenantStatusActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const nextStatus = status === "suspended" ? "active" : "suspended";
  const buttonLabel = status === "suspended" ? "Reactivate" : "Suspend";

  async function handleUpdate() {
    const confirmed = window.confirm(
      `${buttonLabel} workspace "${tenantName}"?`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/ops/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update tenant");
      }

      router.refresh();
    } catch (error: any) {
      window.alert(error.message || "Failed to update tenant");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleUpdate}
      disabled={isSubmitting}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
        status === "suspended"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          : "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {isSubmitting ? "Saving..." : buttonLabel}
    </button>
  );
}
