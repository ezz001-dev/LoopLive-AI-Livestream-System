"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Save, X, Check, DollarSign, Activity, HardDrive, MessageSquare, Users, Mic } from "lucide-react";

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
    active: boolean;
}

export default function PlansManagementPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Plan>>({});

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/ops/plans");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setPlans(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan: Plan) => {
        setEditingId(plan.id);
        setEditForm(plan);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            const res = await fetch("/api/ops/plans", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingId, ...editForm }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            setPlans(plans.map(p => p.id === editingId ? data : p));
            setEditingId(null);
        } catch (err) {
            alert("Gagal menyimpan perubahan");
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-slate-500">Memuat data paket...</div>;
    }

    return (
        <div className="space-y-8 pb-20">
            <section className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Commercial Tiers</h2>
                    <p className="mt-2 text-slate-400">
                        Atur harga dalam IDR/MYR dan batasan resource untuk setiap tingkatan paket.
                    </p>
                </div>
            </section>

            <div className="grid gap-6">
                {plans.map((plan) => (
                    <div 
                        key={plan.id} 
                        className={`rounded-3xl border transition-all ${
                            editingId === plan.id 
                            ? "border-rose-500 bg-rose-500/5 shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)]" 
                            : "border-slate-800 bg-slate-900/40"
                        } p-8`}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-black tracking-tight text-white">{plan.name}</h3>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                                        plan.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-500 border border-slate-700"
                                    }`}>
                                        {plan.code}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400">{plan.description || "No description provided."}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                {editingId === plan.id ? (
                                    <>
                                        <button 
                                            onClick={handleSave}
                                            className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
                                        >
                                            <Save size={16} /> Simpan
                                        </button>
                                        <button 
                                            onClick={handleCancel}
                                            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 active:scale-95"
                                        >
                                            <X size={16} /> Batal
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => handleEdit(plan)}
                                        className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-800 active:scale-95"
                                    >
                                        <Edit2 size={16} /> Edit Paket
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                            {/* Pricing Section */}
                            <div className="col-span-full mb-2 grid gap-6 sm:grid-cols-2">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                        <DollarSign size={12} className="text-rose-400" /> Price IDR (Indonesia)
                                    </label>
                                    {editingId === plan.id ? (
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                                            <input 
                                                type="number"
                                                value={Number(editForm.price_idr)}
                                                onChange={(e) => setEditForm({ ...editForm, price_idr: Number(e.target.value) })}
                                                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-12 py-3 text-lg font-black text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-black text-white">Rp {Number(plan.price_idr).toLocaleString('id-ID')}</p>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                        <DollarSign size={12} className="text-rose-400" /> Price MYR (Malaysia)
                                    </label>
                                    {editingId === plan.id ? (
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">RM</span>
                                            <input 
                                                type="number"
                                                value={Number(editForm.price_myr)}
                                                onChange={(e) => setEditForm({ ...editForm, price_myr: Number(e.target.value) })}
                                                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-12 py-3 text-lg font-black text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-black text-white">RM {Number(plan.price_myr).toLocaleString('en-MY')}</p>
                                    )}
                                </div>
                            </div>

                            {/* Limits Section */}
                            <LimitItem 
                                icon={<Activity size={14} />} 
                                label="Streams" 
                                value={plan.max_active_streams} 
                                editing={editingId === plan.id}
                                field="max_active_streams"
                                form={editForm}
                                setForm={setEditForm}
                            />
                            <LimitItem 
                                icon={<HardDrive size={14} />} 
                                label="Storage (GB)" 
                                value={plan.max_storage_gb} 
                                editing={editingId === plan.id}
                                field="max_storage_gb"
                                form={editForm}
                                setForm={setEditForm}
                            />
                            <LimitItem 
                                icon={<MessageSquare size={14} />} 
                                label="AI Replies/Day" 
                                value={plan.max_ai_responses_day} 
                                editing={editingId === plan.id}
                                field="max_ai_responses_day"
                                form={editForm}
                                setForm={setEditForm}
                            />
                            <LimitItem 
                                icon={<Activity size={14} />} 
                                label="Sessions" 
                                value={plan.max_scheduled_sessions} 
                                editing={editingId === plan.id}
                                field="max_scheduled_sessions"
                                form={editForm}
                                setForm={setEditForm}
                            />
                            <LimitItem 
                                icon={<Users size={14} />} 
                                label="Team Size" 
                                value={plan.max_team_members} 
                                editing={editingId === plan.id}
                                field="max_team_members"
                                form={editForm}
                                setForm={setEditForm}
                            />
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <Mic size={14} className="text-rose-400" /> Custom Voice
                                </label>
                                {editingId === plan.id ? (
                                    <div className="flex items-center gap-3 py-3">
                                        <button 
                                            onClick={() => setEditForm({ ...editForm, can_use_custom_voices: !editForm.can_use_custom_voices })}
                                            className={`h-6 w-11 rounded-full transition-colors relative ${editForm.can_use_custom_voices ? "bg-emerald-500" : "bg-slate-700"}`}
                                        >
                                            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editForm.can_use_custom_voices ? "left-6" : "left-1"}`} />
                                        </button>
                                        <span className="text-xs font-bold text-slate-300">{editForm.can_use_custom_voices ? "Enabled" : "Disabled"}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 py-1">
                                        {plan.can_use_custom_voices ? (
                                            <><Check size={16} className="text-emerald-400" /><span className="text-sm font-bold text-slate-300">Yes</span></>
                                        ) : (
                                            <><X size={16} className="text-slate-600" /><span className="text-sm font-bold text-slate-500">No</span></>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LimitItem({ icon, label, value, editing, field, form, setForm }: any) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <span className="text-rose-400">{icon}</span> {label}
            </label>
            {editing ? (
                <input 
                    type="number"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-lg font-black text-white focus:border-rose-500 focus:outline-none"
                />
            ) : (
                <p className="text-2xl font-black text-slate-200">{value}</p>
            )}
        </div>
    );
}
