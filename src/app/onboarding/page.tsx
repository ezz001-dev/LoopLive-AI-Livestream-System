"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Video, Settings, ArrowRight, CheckCircle2, Loader2, Rocket } from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [aiName, setAiName] = useState("Loop");
    const [persona, setPersona] = useState("");
    const router = useRouter();

    const handleNext = async () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            setLoading(true);
            try {
                // Save AI Persona & Name
                await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ai_name: aiName,
                        ai_persona: persona,
                    })
                });
                router.push("/admin");
            } catch (err) {
                console.error("Failed to save onboarding settings", err);
                router.push("/admin");
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-2xl relative">
                {/* Progress bar */}
                <div className="mb-12 flex items-center justify-between gap-4 px-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex-1 flex flex-col gap-2">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500' : 'bg-slate-800'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest text-center ${step === s ? 'text-blue-400' : 'text-slate-600'}`}>Step 0{s}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[40px] p-10 md:p-14 shadow-3xl min-h-[480px] flex flex-col">
                    {step === 1 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="h-16 w-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-8">
                                <Rocket size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-4">Welcome to LoopLive AI!</h2>
                            <p className="text-slate-400 text-lg leading-relaxed mb-8">
                                Your studio is ready. Let's configure your AI agent to make your first livestream interactive and alive.
                            </p>
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                                <p className="text-sm text-blue-300 font-medium">
                                    💡 You've been granted a <span className="text-white font-bold">14-day Free Trial</span>. You can start streaming immediately after these steps!
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
                             <div className="h-16 w-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-8">
                                <Sparkles size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-4">Name your AI Agent</h2>
                            <p className="text-slate-400 mb-8 italic">What would your viewers call the AI that replies to their chats?</p>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">AI Name</label>
                                    <input
                                        type="text"
                                        value={aiName}
                                        onChange={(e) => setAiName(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                                        placeholder="e.g. Loop, Jarvis, Aurora"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
                             <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-8">
                                <Settings size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-4">Define Persona</h2>
                            <p className="text-slate-400 mb-8 italic">How should your AI behave? (e.g. A helpful assistant for a gaming stream)</p>
                            
                            <textarea
                                value={persona}
                                onChange={(e) => setPersona(e.target.value)}
                                className="w-full h-32 bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm resize-none"
                                placeholder="Describe your AI's personality..."
                            />
                        </div>
                    )}

                    <div className="mt-12 flex items-center justify-between gap-6">
                        <div className="text-sm text-slate-600 font-medium">
                            {step < 3 ? "Wait, I'll do this later" : "Almost there!"}
                        </div>
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 hover:shadow-xl hover:shadow-white/10 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>
                                    <span>{step === 3 ? "Complete Setup" : "Next Step"}</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
                
                <p className="mt-8 text-center text-slate-700 text-[10px] font-black uppercase tracking-[0.3em]">
                    Powered by LoopLive AI Engine
                </p>
            </div>
        </div>
    );
}
