"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(data.redirectTo || "/admin");
        }, 1000);
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-2xl mb-6 group hover:scale-105 transition-transform duration-500">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent transform">
              LoopLive AI
            </h1>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Welcome Back, Master</h2>
          <p className="text-slate-500 mt-2 text-sm uppercase tracking-widest font-semibold italic">Identity Verification Required</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[32px] p-10 shadow-3xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 shadow-inner"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">Access Passphrase</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700 shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-in slide-in-from-top-2 duration-300">
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm animate-in slide-in-from-top-2 duration-300">
                <CheckCircle2 size={18} />
                <span>Access Granted. Redirecting...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full group relative overflow-hidden rounded-2xl py-4 bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-white shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <span>Initiate Login</span>
                )}
              </div>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              New here?{" "}
              <Link
                href="/register"
                className="text-white font-bold hover:text-blue-400 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800/50 text-center">
             <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">
               Secured by LoopLive AI Guardian
             </p>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-600 text-xs">
          © 2026 LoopLive AI. All logical rights Reserved.
        </p>
      </div>
    </div>
  );
}
