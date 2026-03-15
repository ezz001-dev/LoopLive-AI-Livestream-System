"use client";

import React from "react";
import { CreditCard, Zap, Check, ArrowRight, ShieldCheck, BarChart3, Settings } from "lucide-react";
import UsageDashboard from "@/components/admin/UsageDashboard";

export default function BillingPage() {
    const plans = [
        {
            name: "Creator",
            price: "$29",
            features: ["1 Stream Aktif", "10 Respon AI/hari", "5GB Penyimpanan", "Dukungan Standar"],
            color: "blue",
        },
        {
            name: "Studio",
            price: "$99",
            features: ["5 Stream Aktif", "Respon AI Tak Terbatas", "20GB Penyimpanan", "Dukungan Prioritas", "Custom Voice"],
            color: "purple",
            popular: true,
        },
        {
            name: "Agency",
            price: "$249",
            features: ["Stream Tak Terbatas", "Respon AI Tak Terbatas", "100GB Penyimpanan", "Account Manager Khusus", "Akses API"],
            color: "indigo",
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

            {/* Real Usage Analytics */}
            <UsageDashboard />

            {/* Scale Your Studio */}
            <div className="text-center py-12">
                <h2 className="text-2xl font-black text-white mb-2">Tingkatkan Studio Anda</h2>
                <p className="text-slate-500">Pilih paket yang tepat untuk kebutuhan streaming Anda.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 pb-12">
                {plans.map((plan) => (
                    <div 
                        key={plan.name} 
                        className={`relative rounded-[32px] border ${plan.popular ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 bg-slate-900/40'} p-8 flex flex-col transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                                Paling Populer
                            </div>
                        )}
                        <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-black text-white">{plan.price}</span>
                            <span className="text-slate-500 font-bold">/mo</span>
                        </div>

                        <ul className="space-y-4 mb-10 flex-1">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            plan.popular 
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500' 
                            : 'bg-slate-800 text-white hover:bg-slate-700'
                        }`}>
                            Pilih {plan.name}
                            <ArrowRight size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
