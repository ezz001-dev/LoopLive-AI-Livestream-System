"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, User, Building, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }
    setSendingOtp(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowOtp(true);
        setOtpSent(true);
        setSuccess("Verification code sent to your email!");
      } else {
        setError(data.error || "Failed to send code");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError("Please enter the verification code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, workspaceName, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/onboarding");
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-xl relative animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Create Your Studio</h1>
          <p className="text-slate-500 uppercase tracking-[0.2em] text-[10px] font-bold">Start your 14-day free trial today</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[40px] p-8 md:p-12 shadow-3xl">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Full Name</label>
                <div className="relative group">
                   <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-sm"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Workspace Name</label>
                <div className="relative group">
                   <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Building size={16} />
                  </div>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 text-sm"
                    placeholder="My Creative Studio"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-sm"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Passphrase</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700 text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <ShieldCheck size={18} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <ShieldCheck size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {showOtp && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Verification Code</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                    <ShieldCheck size={16} />
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700 text-sm tracking-[0.5em] font-mono"
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
            )}

            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={sendingOtp || !email}
                className="w-full group relative overflow-hidden rounded-2xl py-4 bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 border border-slate-700"
              >
                <div className="relative flex items-center justify-center gap-2">
                  {sendingOtp ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full group relative overflow-hidden rounded-2xl py-4 bg-white text-slate-950 font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>Verify & Create Account</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            )}
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <span>Already have a workspace?</span>
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4 decoration-blue-500/30 transition-colors">
              Sign In Instead
            </Link>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
           <div className="text-[10px] font-black uppercase tracking-widest text-white border border-white/20 px-3 py-1 rounded">256-bit AES</div>
           <div className="text-[10px] font-black uppercase tracking-widest text-white border border-white/20 px-3 py-1 rounded">GDPR Compliant</div>
           <div className="text-[10px] font-black uppercase tracking-widest text-white border border-white/20 px-3 py-1 rounded">SLA 99.9%</div>
        </div>
      </div>
    </div>
  );
}
