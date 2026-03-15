"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Clock, Star, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SubscriptionStatus() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStatus() {
            try {
                const res = await fetch("/api/subs/status");
                if (res.ok) {
                    const json = await res.json();
                    setData(json.subscription);
                }
            } catch (err) {
                console.error("Failed to fetch subscription", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStatus();
    }, []);

    if (loading) return (
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-700" size={20} />
        </div>
    );

    if (!data) return null;

    const isTrial = data.planCode === "free_trial" || data.planCode === "trial";
    const daysLeft = data.trialEndsAt ? 
        Math.ceil((new Date(data.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
        0;

    return (
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 shadow-inner">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    {isTrial ? <Clock size={20} /> : <Star size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Plan: {data.planCode.replace('_', ' ')}</p>
                    <p className="text-sm font-bold text-white truncate">
                        {isTrial ? `${Math.max(0, daysLeft)} days trial left` : 'Active Membership'}
                    </p>
                </div>
            </div>
            
            {isTrial && (
                <div className="mt-4">
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" 
                            style={{ width: `${Math.max(5, (daysLeft / 14) * 100)}%` }}
                        />
                    </div>
                    <Link 
                        href="/admin/billing" 
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-[11px] font-black uppercase tracking-widest text-white hover:opacity-90 transition-all active:scale-[0.97]"
                    >
                        <>
                            <CreditCard size={14} />
                            Upgrade Now
                        </>
                    </Link>
                </div>
            )}
        </div>
    );
}
