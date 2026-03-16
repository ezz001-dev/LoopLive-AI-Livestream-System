"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Zap, Check, ArrowRight, ShieldCheck, BarChart3, Settings, Loader2, MessageSquare, HardDrive, Users } from "lucide-react";
import UsageDashboard from "@/components/admin/UsageDashboard";
import Script from "next/script";

interface Plan {
    id: string;
    code: string;
    name: string;
    description: string | null;
    price_idr: number;
    price_myr: number;
    max_active_streams: number;
    max_storage_gb: number;
    max_ai_responses_day: number;
    max_scheduled_sessions: number;
    max_team_members: number;
    can_use_custom_voices: boolean;
}

interface Subscription {
    id: string;
    plan_code: string;
    status: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
    plan: Plan;
}

declare global {
  interface Window {
    snap: any;
  }
}

export default function BillingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgradingCode, setUpgradingCode] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansRes, subRes] = await Promise.all([
                    fetch("/api/billing/plans"),
                    fetch("/api/billing/subscription")
                ]);
                const plansData = await plansRes.json();
                const subData = await subRes.json();
                
                if (Array.isArray(plansData)) setPlans(plansData);
                if (subData && !subData.error) setSubscription(subData);
            } catch (err) {
                console.error("Failed to fetch billing data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUpgrade = async (planCode: string) => {
        if (subscription?.plan_code === planCode) return;
        
        setUpgradingCode(planCode);
        try {
            const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planCode, period: "monthly" })
            });
            const data = await res.json();
            
            if (data.token) {
                window.snap.pay(data.token, {
                    onSuccess: (result: any) => {
                        window.location.reload();
                    },
                    onPending: (result: any) => {
                        alert("Pembayaran sedang diproses. Silakan selesaikan pembayaran Anda.");
                        window.location.reload();
                    },
                    onError: (result: any) => {
                        alert("Pembayaran gagal. Silakan coba lagi.");
                        setUpgradingCode(null);
                    },
                    onClose: () => {
                        setUpgradingCode(null);
                    }
                });
            } else {
                throw new Error(data.error || "Gagal membuat transaksi");
            }
        } catch (err: any) {
            alert(err.message);
            setUpgradingCode(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Script 
                src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || "https://app.sandbox.midtrans.com/snap/snap.js"}
                data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">Tagihan & Paket</h1>
                    <p className="text-slate-500 mt-1">Kelola langganan dan batas penggunaan Anda.</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Diproteksi LoopLive Billing
                </div>
            </div>

            {/* Current Plan Overview */}
            {subscription && (
                <div className="rounded-[32px] border border-slate-800 bg-slate-900/40 p-8 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                            <Zap size={32} />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Paket Aktif</p>
                            <h3 className="text-2xl font-black text-white">{subscription.plan?.name || subscription.plan_code}</h3>
                            <p className="text-sm text-slate-400 font-medium">
                                Berakhir pada {(() => {
                                    const dateStr = subscription.current_period_end || subscription.trial_ends_at;
                                    if (!dateStr) return "-";
                                    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                })()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            subscription.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                            {subscription.status}
                        </span>
                    </div>
                </div>
            )}

            {/* Real Usage Analytics */}
            <UsageDashboard />

            {/* Scale Your Studio */}
            <div className="text-center py-8">
                <h2 className="text-3xl font-black text-white mb-2">Pilih Paket Masa Depan Anda</h2>
                <p className="text-slate-500">Tingkatkan kapasitas streaming dan respon AI Anda sekarang.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 pb-12">
                {plans.filter(p => p.code !== 'free_trial').map((plan) => {
                    const isCurrent = subscription?.plan_code === plan.code;
                    const isUpgrading = upgradingCode === plan.code;

                    return (
                        <div 
                            key={plan.id} 
                            className={`relative rounded-[32px] border ${isCurrent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/40'} p-8 flex flex-col transition-all hover:scale-[1.02] hover:shadow-2xl`}
                        >
                            {isCurrent && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                                    Paket Anda Saat Ini
                                </div>
                            )}
                            <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-3xl font-black text-white">Rp {Number(plan.price_idr).toLocaleString('id-ID')}</span>
                                <span className="text-slate-500 font-bold text-sm">/bln</span>
                            </div>

                            <ul className="space-y-4 mb-10 flex-1">
                                <PlanFeature icon={<Zap />} text={`${plan.max_active_streams} Stream Aktif`} />
                                <PlanFeature icon={<MessageSquare />} text={`${plan.max_ai_responses_day} Respon AI/hari`} />
                                <PlanFeature icon={<HardDrive />} text={`${plan.max_storage_gb}GB Penyimpanan`} />
                                <PlanFeature icon={<Users />} text={`${plan.max_team_members} Anggota Tim`} />
                                {plan.can_use_custom_voices && <PlanFeature icon={<ShieldCheck />} text="Custom Voice Support" />}
                            </ul>

                            <button 
                                onClick={() => handleUpgrade(plan.code)}
                                disabled={isCurrent || isUpgrading}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                    isCurrent 
                                    ? 'bg-slate-800 text-slate-500 cursor-default' 
                                    : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500'
                                }`}
                            >
                                {isUpgrading ? <Loader2 className="animate-spin h-4 w-4" /> : isCurrent ? 'Sudah Aktif' : `Pilih ${plan.name}`}
                                {!isCurrent && !isUpgrading && <ArrowRight size={14} />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PlanFeature({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <li className="flex items-center gap-3 text-sm text-slate-400 font-medium">
            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                {React.cloneElement(icon as React.ReactElement<any>, { size: 12, strokeWidth: 3 })}
            </div>
            {text}
        </li>
    );
}
