"use client";

import React from "react";
import { CreditCard, Zap, Check, ArrowRight, ShieldCheck, BarChart3 } from "lucide-react";

export default function BillingPage() {
    const plans = [
        {
            name: "Creator",
            price: "$29",
            features: ["1 Active Stream", "10 AI Responses/day", "1GB Storage", "Standard Support"],
            color: "blue",
        },
        {
            name: "Studio",
            price: "$99",
            features: ["5 Active Streams", "Unlimited AI Responses", "20GB Storage", "Priority Support", "Custom Voices"],
            color: "purple",
            popular: true,
        },
        {
            name: "Agency",
            price: "$249",
            features: ["Unlimited Streams", "Unlimited AI Responses", "100GB Storage", "Dedicated Account Manager", "API Access"],
            color: "indigo",
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">Billing & Plans</h1>
                    <p className="text-slate-500 mt-1">Manage your subscription and usage limits.</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Secured by LoopLive Billing
                </div>
            </div>

            {/* Current Usage */}
            <section className="grid md:grid-cols-3 gap-6">
                {[
                    { label: "AI Usage", value: "8/10", suffix: "replies", icon: <Zap size={18} />, color: "yellow" },
                    { label: "Storage", value: "0.4", suffix: "GB", icon: <BarChart3 size={18} />, color: "cyan" },
                    { label: "Streams", value: "0/1", suffix: "active", icon: <CreditCard size={18} />, color: "emerald" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                        <div className="flex items-center gap-3 text-slate-500 mb-4">
                            {stat.icon}
                            <span className="text-xs font-bold uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{stat.value}</span>
                            <span className="text-xs font-bold text-slate-500 uppercase">{stat.suffix}</span>
                        </div>
                    </div>
                ))}
            </section>

            {/* Scale Your Studio */}
            <div className="text-center py-12">
                <h2 className="text-2xl font-black text-white mb-2">Scale Your Studio</h2>
                <p className="text-slate-500">Pick the perfect plan for your streaming needs.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 pb-12">
                {plans.map((plan) => (
                    <div 
                        key={plan.name} 
                        className={`relative rounded-[32px] border ${plan.popular ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 bg-slate-900/40'} p-8 flex flex-col transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                                Most Popular
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
                            Choose {plan.name}
                            <ArrowRight size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
