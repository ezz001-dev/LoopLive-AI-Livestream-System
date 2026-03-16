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
    const [isAdding, setIsAdding] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Plan>>({});
    const [addForm, setAddForm] = useState<Partial<Plan>>({
        code: "",
        name: "",
        description: "",
        price_idr: 0,
        price_myr: 0,
        max_active_streams: 1,
        max_storage_gb: 2,
        max_ai_responses_day: 100,
        max_scheduled_sessions: 5,
        max_team_members: 1,
        can_use_custom_voices: false,
        active: true
    });

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

    const handleAdd = async () => {
        try {
            const res = await fetch("/api/ops/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(addForm),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            setPlans([...plans, data]);
            setIsAdding(false);
            setAddForm({
                code: "",
                name: "",
                description: "",
                price_idr: 0,
                price_myr: 0,
                max_active_streams: 1,
                max_storage_gb: 2,
                max_ai_responses_day: 100,
                max_scheduled_sessions: 5,
                max_team_members: 1,
                can_use_custom_voices: false,
                active: true
            });
        } catch (err) {
            alert("Gagal menambahkan paket baru");
        }
    };

    const toggleActive = async (plan: Plan) => {
        try {
            const newStatus = !plan.active;
            const res = await fetch("/api/ops/plans", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: plan.id, active: newStatus }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setPlans(plans.map(p => p.id === plan.id ? data : p));
        } catch (err) {
            alert("Gagal mengubah status aktif");
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-slate-500">Memuat data paket...</div>;
    }

    return (
        <div className="space-y-8 pb-20">
            <section className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-white">Commercial Tiers</h2>
                    <p className="mt-2 text-slate-400">
                        Atur harga dalam IDR/MYR dan batasan resource untuk setiap tingkatan paket.
                    </p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] active:scale-95"
                    >
                        <Plus size={18} /> Tambah Paket
                    </button>
                )}
            </section>

            {isAdding && (
                <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/5 p-8 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between border-b border-indigo-500/20 pb-6 mb-8">
                        <h3 className="text-xl font-black text-white flex items-center gap-3">
                            <Plus className="text-indigo-400" /> Paket Baru
                        </h3>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleAdd}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-500 active:scale-95"
                            >
                                <Check size={16} /> Buat Paket
                            </button>
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-slate-700 active:scale-95"
                            >
                                <X size={16} /> Batal
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Kode Paket (e.g creator)</label>
                                    <input 
                                        type="text" 
                                        value={addForm.code}
                                        onChange={(e) => setAddForm({...addForm, code: e.target.value})}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                                        placeholder="creator"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nama Paket</label>
                                    <input 
                                        type="text" 
                                        value={addForm.name}
                                        onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                                        placeholder="Creator Plan"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Deskripsi</label>
                                <textarea 
                                    value={addForm.description || ""}
                                    onChange={(e) => setAddForm({...addForm, description: e.target.value})}
                                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none min-h-[100px]"
                                    placeholder="Deskripsi singkat tentang fitur paket ini..."
                                />
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Harga IDR</label>
                                    <input 
                                        type="number" 
                                        value={addForm.price_idr}
                                        onChange={(e) => setAddForm({...addForm, price_idr: Number(e.target.value)})}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Harga MYR</label>
                                    <input 
                                        type="number" 
                                        value={addForm.price_myr}
                                        onChange={(e) => setAddForm({...addForm, price_myr: Number(e.target.value)})}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            <LimitInput label="Streams" icon={<Activity size={14} />} value={addForm.max_active_streams} onChange={(v: number) => setAddForm({...addForm, max_active_streams: v})} />
                            <LimitInput label="Storage (GB)" icon={<HardDrive size={14} />} value={addForm.max_storage_gb} onChange={(v: number) => setAddForm({...addForm, max_storage_gb: v})} />
                            <LimitInput label="AI Replies/Day" icon={<MessageSquare size={14} />} value={addForm.max_ai_responses_day} onChange={(v: number) => setAddForm({...addForm, max_ai_responses_day: v})} />
                            <LimitInput label="Sessions" icon={<Activity size={14} />} value={addForm.max_scheduled_sessions} onChange={(v: number) => setAddForm({...addForm, max_scheduled_sessions: v})} />
                            <LimitInput label="Team Size" icon={<Users size={14} />} value={addForm.max_team_members} onChange={(v: number) => setAddForm({...addForm, max_team_members: v})} />
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Mic size={14} className="text-indigo-400" /> Custom Voice
                                </label>
                                <div className="flex items-center gap-3 py-3">
                                    <button 
                                        onClick={() => setAddForm({ ...addForm, can_use_custom_voices: !addForm.can_use_custom_voices })}
                                        className={`h-6 w-11 rounded-full transition-colors relative ${addForm.can_use_custom_voices ? "bg-emerald-500" : "bg-slate-700"}`}
                                    >
                                        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${addForm.can_use_custom_voices ? "left-6" : "left-1"}`} />
                                    </button>
                                    <span className="text-xs font-bold text-slate-300">{addForm.can_use_custom_voices ? "Yes" : "No"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div className="grid gap-6">
                {plans.map((plan) => (
                    <div 
                        key={plan.id} 
                        className={`rounded-3xl border transition-all duration-300 ${
                            editingId === plan.id 
                            ? "border-rose-500 bg-rose-500/5 shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)]" 
                            : plan.active ? "border-slate-800 bg-slate-900/40" : "border-slate-800/50 bg-slate-950/50 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
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
                                    {!plan.active && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest">Inactive</span>}
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
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-3 pr-4 border-r border-slate-800">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{plan.active ? 'Active' : 'Disabled'}</span>
                                            <button 
                                                onClick={() => toggleActive(plan)}
                                                className={`h-6 w-11 rounded-full transition-colors relative ${plan.active ? "bg-emerald-500" : "bg-slate-700"}`}
                                            >
                                                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${plan.active ? "left-6" : "left-1"}`} />
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => handleEdit(plan)}
                                            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-800 active:scale-95"
                                        >
                                            <Edit2 size={16} /> Edit Paket
                                        </button>
                                    </div>
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

interface LimitItemProps {
    icon: React.ReactNode;
    label: string;
    value: number | string | boolean | null;
    editing: boolean;
    field: keyof Plan;
    form: Partial<Plan>;
    setForm: (form: Partial<Plan>) => void;
}

function LimitItem({ icon, label, value, editing, field, form, setForm }: LimitItemProps) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <span className="text-rose-400">{icon}</span> {label}
            </label>
            {editing ? (
                <input 
                    type="number"
                    value={form[field] as number}
                    onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-lg font-black text-white focus:border-rose-500 focus:outline-none"
                />
            ) : (
                <p className="text-2xl font-black text-slate-200">{String(value)}</p>
            )}
        </div>
    );
}

interface LimitInputProps {
    icon: React.ReactNode;
    label: string;
    value: number | undefined;
    onChange: (v: number) => void;
}

function LimitInput({ icon, label, value, onChange }: LimitInputProps) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <span className="text-indigo-400">{icon}</span> {label}
            </label>
            <input 
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
            />
        </div>
    );
}
