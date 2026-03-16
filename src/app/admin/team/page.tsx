"use client";

import React, { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Mail, Shield, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface Member {
    id: string;
    role: string;
    user: {
        id: string;
        email: string;
        display_name: string | null;
    };
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
}

interface TeamData {
    members: Member[];
    pendingInvitations: Invitation[];
    limits: {
        max: number;
        current: number;
    };
}

export default function TeamPage() {
    const [data, setData] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

    const fetchTeam = async () => {
        try {
            const res = await fetch("/api/admin/team");
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) {
            console.error("Failed to fetch team", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            const json = await res.json();

            if (res.ok) {
                setMessage({ 
                    type: "success", 
                    text: json.pending 
                        ? "Undangan dikirim! Anggota tim akan muncul otomatis setelah mereka mendaftar." 
                        : "Berhasil mengundang anggota tim baru!" 
                });
                setInviteEmail("");
                fetchTeam();
            } else {
                setMessage({ type: "error", text: json.error || "Gagal mengundang anggota." });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Terjadi kesalahan koneksi." });
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus anggota ini dari workspace?")) return;
        setRemovingId(id);

        try {
            const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
            if (res.ok) {
                setMessage({ type: "success", text: "Anggota tim telah dihapus." });
                fetchTeam();
            } else {
                const json = await res.json();
                setMessage({ type: "error", text: json.error || "Gagal menghapus anggota." });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Terjadi kesalahan koneksi." });
        } finally {
            setRemovingId(null);
        }
    };

    const handleCancelInvite = async (id: string) => {
        if (!confirm("Batalkan undangan untuk email ini?")) return;
        setCancelingId(id);

        try {
            const res = await fetch(`/api/admin/team/invitations/${id}`, { method: "DELETE" });
            if (res.ok) {
                setMessage({ type: "success", text: "Undangan telah dibatalkan." });
                fetchTeam();
            } else {
                const json = await res.json();
                setMessage({ type: "error", text: json.error || "Gagal membatalkan undangan." });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Terjadi kesalahan koneksi." });
        } finally {
            setCancelingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
        );
    }

    const limitPercentage = data ? (data.limits.current / data.limits.max) * 100 : 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white">Tim & Kolaborasi</h1>
                    <p className="text-slate-500 mt-1">Kelola akses dan undang rekan kerja ke workspace Anda.</p>
                </div>
                
                {/* Limit Card Mini */}
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-3xl min-w-[240px]">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2">
                        <span className="text-slate-500">Kapasitas Kursi</span>
                        <span className="text-blue-400">{data?.limits.current} / {data?.limits.max}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-1000"
                            style={{ width: `${Math.min(limitPercentage, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Invite Form */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6 sticky top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <UserPlus size={20} />
                            </div>
                            <h2 className="text-lg font-black text-white">Undang Anggota</h2>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Alamat Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input 
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="rekan@email.com"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Peran (Role)</label>
                                <select 
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:border-blue-500 outline-none transition-all appearance-none"
                                >
                                    <option value="member">Member (Operator)</option>
                                    <option value="admin">Admin (Full Control)</option>
                                </select>
                            </div>

                            {message && (
                                <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                                    message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'
                                } text-sm`}>
                                    {message.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                                    {message.text}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={inviting || !inviteEmail || (!!data && data.limits.current >= data.limits.max)}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {inviting ? <Loader2 className="animate-spin h-4 w-4" /> : "Kirim Undangan"}
                            </button>
                            
                            {data && data.limits.current >= data.limits.max && (
                                <p className="text-[10px] text-amber-500 font-bold text-center mt-2 italic">
                                    Limit paket tercapai. Silakan upgrade paket untuk menambah anggota.
                                </p>
                            )}
                        </form>
                    </div>
                </div>

                {/* Users List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h2 className="text-lg font-black text-white flex items-center gap-3">
                            <Users size={20} className="text-slate-500" />
                            Daftar Anggota
                        </h2>
                        <span className="text-xs text-slate-500 font-bold">{data?.members.length} Total</span>
                    </div>

                    <div className="space-y-4">
                        {data?.members && data.members.length > 0 ? (
                            <>
                                {data.members.map((member) => (
                                    <div 
                                        key={member.id}
                                        className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex items-center justify-between hover:border-slate-700 transition-all group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-lg font-black text-white group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                                                {member.user.display_name ? member.user.display_name[0].toUpperCase() : member.user.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">
                                                    {member.user.display_name || "Tanpa Nama"}
                                                    <span className="text-xs text-slate-500 font-normal ml-2 italic">(Aktif)</span>
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Mail size={12} />
                                                    {member.user.email}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                member.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                                                member.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                                'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                                {member.role === 'owner' ? <ShieldCheck size={10} /> : <Shield size={10} />}
                                                {member.role}
                                            </div>

                                            {member.role !== 'owner' && (
                                                <button 
                                                    onClick={() => handleRemove(member.id)}
                                                    disabled={removingId === member.id}
                                                    className="p-2.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    {removingId === member.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : null}

                        {/* Pending Invitations */}
                        {data?.pendingInvitations && data.pendingInvitations.length > 0 ? (
                            <>
                                {data.pendingInvitations.map((invite) => (
                                    <div 
                                        key={invite.id}
                                        className="bg-slate-900/40 border border-amber-500/20 border-dashed rounded-3xl p-5 flex items-center justify-between hover:border-amber-500/40 transition-all group"
                                    >
                                        <div className="flex items-center gap-5 opacity-60">
                                            <div className="h-12 w-12 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center text-lg font-black text-amber-500 italic">
                                                ?
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold">
                                                    {invite.email.split('@')[0]}
                                                    <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full ml-3 uppercase tracking-tighter">Menunggu Registrasi</span>
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Mail size={12} />
                                                    {invite.email}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-slate-800 text-slate-400 border-slate-700 opacity-60">
                                                <Shield size={10} />
                                                {invite.role}
                                            </div>

                                            <button 
                                                onClick={() => handleCancelInvite(invite.id)}
                                                disabled={cancelingId === invite.id}
                                                className="p-2.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                title="Batalkan Undangan"
                                            >
                                                {cancelingId === invite.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
